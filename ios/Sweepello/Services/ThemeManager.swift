import SwiftUI

@MainActor
class ThemeManager: ObservableObject {
    @Published var isDarkMode: Bool {
        didSet {
            UserDefaults.standard.set(isDarkMode, forKey: "isDarkMode")
        }
    }

    var colorScheme: ColorScheme? {
        isDarkMode ? .dark : .light
    }

    init() {
        self.isDarkMode = UserDefaults.standard.bool(forKey: "isDarkMode")
    }

    func toggle() {
        isDarkMode.toggle()
    }
}

// MARK: - Sweepello Brand Colors (matches web)

extension Color {
    // Primary brand blue - web: hsl(204, 100%, 50%) / #0099FF
    static let sweepelloPrimary = Color(red: 0.0, green: 0.6, blue: 1.0)

    // Cyan/teal accent - web: #00CCBB
    static let sweepelloSecondary = Color(red: 0.0, green: 0.8, blue: 0.73)

    // Green accent - web: #44CC00
    static let sweepelloAccent = Color(red: 0.27, green: 0.8, blue: 0.0)

    // Brand gradient (blue → cyan → green)
    static let sweepelloGradient = LinearGradient(
        colors: [sweepelloPrimary, sweepelloSecondary, sweepelloAccent],
        startPoint: .leading,
        endPoint: .trailing
    )

    // Role-based sidebar colors
    static let adminPrimary = Color(red: 0.0, green: 0.6, blue: 1.0)
    static let clientPrimary = Color(red: 0.0, green: 0.6, blue: 1.0)
    static let contractorPrimary = Color(red: 0.27, green: 0.8, blue: 0.0)

    // Status colors
    static let statusPending = Color.orange
    static let statusActive = Color(red: 0.0, green: 0.6, blue: 1.0)
    static let statusInProgress = Color(red: 0.0, green: 0.8, blue: 0.73)
    static let statusCompleted = Color.green
    static let statusCancelled = Color.red
}
