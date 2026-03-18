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

// MARK: - Sweepello Brand Colors

extension Color {
    static let sweepelloPrimary = Color.indigo
    static let sweepelloSecondary = Color(red: 0.45, green: 0.35, blue: 0.75)
    static let sweepelloAccent = Color(red: 0.3, green: 0.8, blue: 0.65)

    // Role-based sidebar colors
    static let adminPrimary = Color.indigo
    static let clientPrimary = Color.blue
    static let contractorPrimary = Color(red: 0.2, green: 0.7, blue: 0.4)

    // Status colors
    static let statusPending = Color.orange
    static let statusActive = Color.blue
    static let statusInProgress = Color.indigo
    static let statusCompleted = Color.green
    static let statusCancelled = Color.red
}
