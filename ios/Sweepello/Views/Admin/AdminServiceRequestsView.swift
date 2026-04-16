import SwiftUI

struct AdminServiceRequestsView: View {
    @State private var requests: [ServiceRequest] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else {
                List(requests) { request in
                    NavigationLink {
                        AdminRequestDetailView(request: request, onUpdate: { await loadRequests() })
                    } label: {
                        AdminServiceRequestRow(request: request)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Service Requests")
        .refreshable { await loadRequests() }
        .task { await loadRequests() }
    }

    private func loadRequests() async {
        isLoading = true
        requests = (try? await APIClient.shared.get("/api/service-requests")) ?? []
        isLoading = false
    }
}

struct AdminServiceRequestRow: View {
    let request: ServiceRequest

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(request.propertyAddress)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                Spacer()
                StatusBadge(status: request.requestStatus.displayName, color: statusColor)
            }
            HStack {
                Text(request.serviceType.capitalized)
                if let price = request.priceValue {
                    Text("$\(String(format: "%.0f", price))")
                }
                Spacer()
                if let zip = request.zipCode {
                    Text(zip)
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch request.status {
        case "pending": return .orange
        case "broadcasting": return .purple
        case "assigned", "confirmed": return .blue
        case "in_progress": return .indigo
        case "completed": return .green
        default: return .gray
        }
    }
}

struct AdminRequestDetailView: View {
    let request: ServiceRequest
    let onUpdate: () async -> Void
    @State private var isBroadcasting = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                StatusBadge(status: request.requestStatus.displayName, color: .blue)
                    .scaleEffect(1.3)
                    .padding()

                DetailSection(title: "Request Details") {
                    DetailRow(icon: "mappin.circle", label: "Address", value: request.propertyAddress)
                    if let city = request.city { DetailRow(icon: "building.2", label: "City", value: city) }
                    if let zip = request.zipCode { DetailRow(icon: "location", label: "ZIP", value: zip) }
                    DetailRow(icon: "house", label: "Property Type", value: request.propertyType.capitalized)
                    DetailRow(icon: "sparkles", label: "Service Type", value: request.serviceType.capitalized)
                    if let beds = request.bedrooms { DetailRow(icon: "bed.double", label: "Bedrooms", value: "\(beds)") }
                    if let baths = request.bathrooms { DetailRow(icon: "shower", label: "Bathrooms", value: "\(baths)") }
                    if let sqft = request.squareFootage { DetailRow(icon: "ruler", label: "Sq Ft", value: "\(sqft)") }
                }

                DetailSection(title: "Pricing") {
                    if let price = request.estimatedPrice { DetailRow(icon: "dollarsign.circle", label: "Client Price", value: "$\(price)") }
                    if let cost = request.subcontractorCost { DetailRow(icon: "banknote", label: "Sub Cost", value: "$\(cost)") }
                }

                if let notes = request.specialInstructions {
                    DetailSection(title: "Special Instructions") {
                        Text(notes)
                            .font(.subheadline)
                    }
                }

                // Actions
                if request.status == "pending" {
                    Button {
                        broadcastOffers()
                    } label: {
                        Label(isBroadcasting ? "Broadcasting..." : "Broadcast to Cleaners", systemImage: "megaphone.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.adminPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(isBroadcasting)
                }
            }
            .padding()
        }
        .navigationTitle("Request #\(request.id.prefix(8))")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func broadcastOffers() {
        isBroadcasting = true
        Task {
            struct EmptyBody: Codable {}
            let _: ServiceRequest? = try? await APIClient.shared.post("/api/service-requests/\(request.id)/broadcast", body: EmptyBody())
            await onUpdate()
            isBroadcasting = false
        }
    }
}
