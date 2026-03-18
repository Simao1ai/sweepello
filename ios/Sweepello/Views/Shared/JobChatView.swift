import SwiftUI

struct JobChatView: View {
    let jobId: String
    let currentUserId: String
    let currentUserRole: String
    let currentUserName: String

    @StateObject private var wsManager = WebSocketManager.shared
    @State private var messages: [ChatMessage] = []
    @State private var newMessage = ""
    @State private var isLoading = true

    var body: some View {
        VStack(spacing: 0) {
            // Messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(messages) { message in
                            ChatBubble(
                                message: message,
                                isOwnMessage: message.senderId == currentUserId
                            )
                            .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }

            Divider()

            // Input
            HStack(spacing: 12) {
                TextField("Type a message...", text: $newMessage)
                    .textFieldStyle(.roundedBorder)

                Button {
                    sendMessage()
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundStyle(newMessage.isEmpty ? .gray : Color.sweepelloPrimary)
                }
                .disabled(newMessage.isEmpty)
            }
            .padding()
        }
        .navigationTitle("Chat")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            wsManager.onEvent = { event in
                if case .chatMessage(let msg) = event, msg.jobId == jobId {
                    messages.append(msg)
                }
            }
        }
    }

    private func sendMessage() {
        let content = newMessage.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }
        wsManager.sendChatMessage(
            jobId: jobId,
            content: content,
            senderRole: currentUserRole,
            senderName: currentUserName
        )
        // Optimistic update
        let msg = ChatMessage(
            id: UUID().uuidString,
            jobId: jobId,
            senderId: currentUserId,
            senderRole: currentUserRole,
            senderName: currentUserName,
            content: content,
            isRead: false,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        messages.append(msg)
        newMessage = ""
    }
}

struct ChatBubble: View {
    let message: ChatMessage
    let isOwnMessage: Bool

    var body: some View {
        HStack {
            if isOwnMessage { Spacer() }

            VStack(alignment: isOwnMessage ? .trailing : .leading, spacing: 4) {
                if !isOwnMessage {
                    Text(message.senderName)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text(message.content)
                    .font(.subheadline)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isOwnMessage ? Color.sweepelloPrimary : Color(.systemGroupedBackground))
                    .foregroundStyle(isOwnMessage ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            if !isOwnMessage { Spacer() }
        }
    }
}
