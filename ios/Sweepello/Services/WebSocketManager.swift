import Foundation

// MARK: - WebSocket Event

enum WSEvent {
    case jobUpdate(Job)
    case locationUpdate(cleanerId: String, lat: Double, lng: Double)
    case notification(AppNotification)
    case chatMessage(ChatMessage)
    case offerReceived(JobOffer)
    case connected
    case disconnected
}

// MARK: - WebSocket Manager

@MainActor
class WebSocketManager: ObservableObject {
    static let shared = WebSocketManager()

    @Published var isConnected = false
    private var webSocket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var userId: String?
    private var reconnectTask: Task<Void, Never>?

    var onEvent: ((WSEvent) -> Void)?

    func connect(userId: String) {
        self.userId = userId
        guard let url = URL(string: "\(Configuration.wsBaseURL)?userId=\(userId)") else { return }

        let session = URLSession(configuration: .default)
        self.session = session
        let ws = session.webSocketTask(with: url)
        self.webSocket = ws
        ws.resume()
        isConnected = true
        onEvent?(.connected)
        receiveMessages()
    }

    func disconnect() {
        reconnectTask?.cancel()
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        isConnected = false
        onEvent?(.disconnected)
    }

    func send(_ message: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let string = String(data: data, encoding: .utf8) else { return }
        webSocket?.send(.string(string)) { _ in }
    }

    // MARK: - Location Updates (Contractor)

    func sendLocation(lat: Double, lng: Double) {
        send([
            "type": "location_update",
            "userId": userId ?? "",
            "lat": lat,
            "lng": lng
        ])
    }

    func sendGoOnline(_ isOnline: Bool) {
        send([
            "type": "go_online",
            "userId": userId ?? "",
            "isOnline": isOnline
        ])
    }

    // MARK: - Chat

    func sendChatMessage(jobId: String, content: String, senderRole: String, senderName: String) {
        send([
            "type": "chat_message",
            "jobId": jobId,
            "senderId": userId ?? "",
            "senderRole": senderRole,
            "senderName": senderName,
            "content": content
        ])
    }

    // MARK: - Private

    private func receiveMessages() {
        webSocket?.receive { [weak self] result in
            Task { @MainActor in
                switch result {
                case .success(let message):
                    switch message {
                    case .string(let text):
                        self?.handleMessage(text)
                    case .data(let data):
                        if let text = String(data: data, encoding: .utf8) {
                            self?.handleMessage(text)
                        }
                    @unknown default:
                        break
                    }
                    self?.receiveMessages()
                case .failure:
                    self?.isConnected = false
                    self?.onEvent?(.disconnected)
                    self?.scheduleReconnect()
                }
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        let decoder = JSONDecoder()

        switch type {
        case "job_update":
            if let jobData = try? JSONSerialization.data(withJSONObject: json["job"] ?? [:]),
               let job = try? decoder.decode(Job.self, from: jobData) {
                onEvent?(.jobUpdate(job))
            }
        case "location_update":
            if let cid = json["cleanerId"] as? String,
               let lat = json["lat"] as? Double,
               let lng = json["lng"] as? Double {
                onEvent?(.locationUpdate(cleanerId: cid, lat: lat, lng: lng))
            }
        case "notification":
            if let nData = try? JSONSerialization.data(withJSONObject: json["notification"] ?? [:]),
               let notification = try? decoder.decode(AppNotification.self, from: nData) {
                onEvent?(.notification(notification))
            }
        case "chat_message":
            if let mData = try? JSONSerialization.data(withJSONObject: json["message"] ?? [:]),
               let msg = try? decoder.decode(ChatMessage.self, from: mData) {
                onEvent?(.chatMessage(msg))
            }
        case "job_offer":
            if let oData = try? JSONSerialization.data(withJSONObject: json["offer"] ?? [:]),
               let offer = try? decoder.decode(JobOffer.self, from: oData) {
                onEvent?(.offerReceived(offer))
            }
        default:
            break
        }
    }

    private func scheduleReconnect() {
        reconnectTask = Task {
            try? await Task.sleep(nanoseconds: UInt64(Configuration.wsReconnectDelay * 1_000_000_000))
            guard !Task.isCancelled, let uid = userId else { return }
            connect(userId: uid)
        }
    }
}
