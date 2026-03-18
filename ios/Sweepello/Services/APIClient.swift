import Foundation

// MARK: - API Error

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case forbidden
    case notFound
    case serverError(Int)
    case decodingError(Error)
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .invalidResponse: return "Invalid server response"
        case .unauthorized: return "Please log in again"
        case .forbidden: return "You don't have permission to do that"
        case .notFound: return "Resource not found"
        case .serverError(let code): return "Server error (\(code))"
        case .decodingError(let error): return "Data error: \(error.localizedDescription)"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        }
    }
}

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let baseURL: String
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = Configuration.requestTimeout
        config.httpCookieAcceptPolicy = .always
        config.httpShouldSetCookies = true
        config.httpCookieStorage = HTTPCookieStorage.shared

        self.session = URLSession(configuration: config)
        self.baseURL = Configuration.apiBaseURL
        self.decoder = JSONDecoder()
    }

    // MARK: - Core Request Methods

    func get<T: Decodable>(_ path: String, queryItems: [URLQueryItem]? = nil) async throws -> T {
        let request = try buildRequest(path: path, method: "GET", queryItems: queryItems)
        return try await execute(request)
    }

    func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(path: path, method: "POST")
        request.httpBody = try JSONEncoder().encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await execute(request)
    }

    func post<T: Decodable>(_ path: String) async throws -> T {
        let request = try buildRequest(path: path, method: "POST")
        return try await execute(request)
    }

    func patch<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        var request = try buildRequest(path: path, method: "PATCH")
        request.httpBody = try JSONEncoder().encode(body)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return try await execute(request)
    }

    func patch<T: Decodable>(_ path: String) async throws -> T {
        let request = try buildRequest(path: path, method: "PATCH")
        return try await execute(request)
    }

    func delete(_ path: String) async throws {
        let request = try buildRequest(path: path, method: "DELETE")
        let (_, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(httpResponse.statusCode) else {
            throw mapStatusCode(httpResponse.statusCode)
        }
    }

    // MARK: - Private Helpers

    private func buildRequest(path: String, method: String, queryItems: [URLQueryItem]? = nil) throws -> URLRequest {
        guard var components = URLComponents(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }
        if let queryItems {
            components.queryItems = queryItems
        }
        guard let url = components.url else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        return request
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw mapStatusCode(httpResponse.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    private func mapStatusCode(_ code: Int) -> APIError {
        switch code {
        case 401: return .unauthorized
        case 403: return .forbidden
        case 404: return .notFound
        default: return .serverError(code)
        }
    }
}
