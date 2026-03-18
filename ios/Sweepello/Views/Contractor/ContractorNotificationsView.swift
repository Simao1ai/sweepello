import SwiftUI

struct ContractorNotificationsView: View {
    @State private var notifications: [AppNotification] = []
    @State private var isLoading = true

    var unreadCount: Int {
        notifications.filter { !$0.isRead }.count
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if notifications.isEmpty {
                    EmptyStateView(
                        icon: "bell.slash",
                        title: "No notifications",
                        message: "You're all caught up!"
                    )
                } else {
                    List {
                        if unreadCount > 0 {
                            Button("Mark All as Read") {
                                markAllRead()
                            }
                            .font(.subheadline)
                            .foregroundStyle(Color.contractorPrimary)
                        }

                        ForEach(notifications) { notification in
                            NotificationRow(notification: notification)
                                .onTapGesture {
                                    markRead(notification)
                                }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Notifications")
            .toolbar {
                if unreadCount > 0 {
                    ToolbarItem(placement: .topBarTrailing) {
                        Text("\(unreadCount) unread")
                            .font(.caption)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.orange)
                            .clipShape(Capsule())
                    }
                }
            }
            .refreshable { await loadNotifications() }
            .task { await loadNotifications() }
        }
    }

    private func loadNotifications() async {
        isLoading = true
        notifications = (try? await APIClient.shared.get("/api/notifications")) ?? []
        isLoading = false
    }

    private func markRead(_ notification: AppNotification) {
        Task {
            struct Empty: Codable {}
            let _: AppNotification? = try? await APIClient.shared.patch("/api/notifications/\(notification.id)/read")
            await loadNotifications()
        }
    }

    private func markAllRead() {
        Task {
            struct Empty: Codable {}
            let _: [String: Bool]? = try? await APIClient.shared.post("/api/notifications/read-all")
            await loadNotifications()
        }
    }
}

struct NotificationRow: View {
    let notification: AppNotification

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: notification.notificationType.iconName)
                .font(.title3)
                .foregroundStyle(notification.isRead ? .secondary : Color.contractorPrimary)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 4) {
                Text(notification.title)
                    .font(.subheadline)
                    .fontWeight(notification.isRead ? .regular : .bold)
                Text(notification.message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer()

            if !notification.isRead {
                Circle()
                    .fill(Color.contractorPrimary)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(.vertical, 4)
        .opacity(notification.isRead ? 0.7 : 1.0)
    }
}
