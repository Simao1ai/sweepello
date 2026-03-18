import SwiftUI

struct AdminClientsView: View {
    @State private var clients: [Client] = []
    @State private var isLoading = true
    @State private var searchText = ""

    var filteredClients: [Client] {
        if searchText.isEmpty { return clients }
        return clients.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.email?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else {
                    List(filteredClients) { client in
                        NavigationLink {
                            ClientDetailView(client: client)
                        } label: {
                            ClientRow(client: client)
                        }
                    }
                    .listStyle(.plain)
                    .searchable(text: $searchText, prompt: "Search clients...")
                }
            }
            .navigationTitle("Clients")
            .refreshable { await loadClients() }
            .task { await loadClients() }
        }
    }

    private func loadClients() async {
        isLoading = true
        clients = (try? await APIClient.shared.get("/api/clients")) ?? []
        isLoading = false
    }
}

struct ClientRow: View {
    let client: Client

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.clientPrimary.opacity(0.15))
                    .frame(width: 44, height: 44)
                Text(String(client.name.prefix(1)))
                    .font(.headline)
                    .foregroundStyle(Color.clientPrimary)
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(client.name)
                        .font(.subheadline.bold())
                    if client.isVip ?? false {
                        Text("VIP")
                            .font(.caption2.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.yellow)
                            .clipShape(Capsule())
                    }
                }
                Text(client.propertyAddress)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            Text(client.propertyType.capitalized)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

struct ClientDetailView: View {
    let client: Client

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    ZStack {
                        Circle()
                            .fill(Color.clientPrimary.opacity(0.15))
                            .frame(width: 80, height: 80)
                        Text(String(client.name.prefix(1)))
                            .font(.largeTitle.bold())
                            .foregroundStyle(Color.clientPrimary)
                    }
                    Text(client.name)
                        .font(.title2.bold())
                    if client.isVip ?? false {
                        Text("VIP Client")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 4)
                            .background(Color.yellow)
                            .clipShape(Capsule())
                    }
                }

                DetailSection(title: "Property") {
                    DetailRow(icon: "mappin.circle", label: "Address", value: client.propertyAddress)
                    DetailRow(icon: "house", label: "Type", value: client.propertyType.capitalized)
                    if let beds = client.bedrooms {
                        DetailRow(icon: "bed.double", label: "Bedrooms", value: "\(beds)")
                    }
                    if let baths = client.bathrooms {
                        DetailRow(icon: "shower", label: "Bathrooms", value: "\(baths)")
                    }
                }

                DetailSection(title: "Contact") {
                    if let email = client.email {
                        DetailRow(icon: "envelope", label: "Email", value: email)
                    }
                    if let phone = client.phone {
                        DetailRow(icon: "phone", label: "Phone", value: phone)
                    }
                }
            }
            .padding()
        }
        .navigationTitle(client.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
