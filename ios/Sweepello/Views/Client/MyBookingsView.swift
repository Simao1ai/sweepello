import SwiftUI

struct MyBookingsView: View {
    @State private var bookings: [ServiceRequest] = []
    @State private var reviews: [Review] = []
    @State private var isLoading = true
    @State private var selectedFilter: BookingFilter = .all

    enum BookingFilter: String, CaseIterable {
        case all = "All"
        case active = "Active"
        case completed = "Completed"
    }

    var reviewsByJobId: [String: Review] {
        Dictionary(uniqueKeysWithValues: reviews.compactMap { r in
            (r.jobId, r)
        })
    }

    var filteredBookings: [ServiceRequest] {
        switch selectedFilter {
        case .all: return bookings
        case .active: return bookings.filter { !["completed", "cancelled"].contains($0.status) }
        case .completed: return bookings.filter { $0.status == "completed" }
        }
    }

    var unratedCompleted: [ServiceRequest] {
        bookings.filter { b in
            b.status == "completed" && b.jobId != nil && reviewsByJobId[b.jobId!] == nil
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filter", selection: $selectedFilter) {
                    ForEach(BookingFilter.allCases, id: \.self) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                if isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if filteredBookings.isEmpty {
                    Spacer()
                    EmptyStateView(
                        icon: "calendar.badge.exclamationmark",
                        title: "No bookings found",
                        message: selectedFilter == .all ? "Book your first cleaning!" : "No \(selectedFilter.rawValue.lowercased()) bookings"
                    )
                    Spacer()
                } else {
                    List {
                        // Rate prompts for unrated completed bookings
                        if !unratedCompleted.isEmpty && selectedFilter != .active {
                            Section {
                                ForEach(unratedCompleted) { booking in
                                    NavigationLink {
                                        RateServiceView(serviceRequestId: booking.id)
                                    } label: {
                                        RatePromptRow(address: booking.propertyAddress)
                                    }
                                }
                            } header: {
                                Text("Rate Your Experience")
                            }
                        }

                        // Bookings list
                        Section {
                            ForEach(filteredBookings) { booking in
                                NavigationLink {
                                    BookingDetailView(request: booking, review: booking.jobId.flatMap { reviewsByJobId[$0] })
                                } label: {
                                    BookingRow(request: booking, review: booking.jobId.flatMap { reviewsByJobId[$0] })
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("My Bookings")
            .refreshable {
                await loadData()
            }
            .task {
                await loadData()
            }
        }
    }

    private func loadData() async {
        isLoading = true
        async let bookingsResult: [ServiceRequest] = APIClient.shared.get("/api/service-requests/mine")
        async let reviewsResult: [Review] = APIClient.shared.get("/api/reviews/mine")
        bookings = (try? await bookingsResult) ?? []
        reviews = (try? await reviewsResult) ?? []
        isLoading = false
    }
}

struct RatePromptRow: View {
    let address: String

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 2) {
                ForEach(1...5, id: \.self) { _ in
                    Image(systemName: "star.fill")
                        .font(.caption)
                        .foregroundStyle(.yellow)
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("How was your cleaning?")
                    .font(.subheadline.bold())
                Text(address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            Text("Rate Now")
                .font(.caption.bold())
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.yellow.opacity(0.85))
                .clipShape(Capsule())
        }
        .padding(.vertical, 4)
    }
}

struct BookingRow: View {
    let request: ServiceRequest
    var review: Review? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(request.propertyAddress)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                Spacer()
                StatusBadge(status: request.requestStatus.displayName, color: statusColor)
            }
            HStack(spacing: 16) {
                Label(request.serviceType.capitalized, systemImage: "sparkles")
                if let price = request.priceValue {
                    Label("$\(String(format: "%.0f", price))", systemImage: "dollarsign.circle")
                }
                if let review {
                    HStack(spacing: 2) {
                        ForEach(1...5, id: \.self) { i in
                            Image(systemName: i <= review.rating ? "star.fill" : "star")
                                .font(.system(size: 8))
                                .foregroundStyle(i <= review.rating ? .yellow : .gray.opacity(0.3))
                        }
                        Text("Rated")
                            .foregroundStyle(.secondary)
                    }
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
        case "confirmed", "assigned": return .blue
        case "in_progress": return .indigo
        case "completed": return .green
        default: return .gray
        }
    }
}

struct BookingDetailView: View {
    let request: ServiceRequest
    var review: Review? = nil
    @State private var showRating = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                VStack(spacing: 12) {
                    StatusBadge(status: request.requestStatus.displayName, color: .blue)
                        .scaleEffect(1.2)
                    StatusTimeline(currentStatus: request.status)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(.systemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16))

                DetailSection(title: "Property") {
                    DetailRow(icon: "mappin.circle", label: "Address", value: request.propertyAddress)
                    if let city = request.city {
                        DetailRow(icon: "building.2", label: "City", value: city)
                    }
                    DetailRow(icon: "house", label: "Type", value: request.propertyType.capitalized)
                    if let beds = request.bedrooms {
                        DetailRow(icon: "bed.double", label: "Bedrooms", value: "\(beds)")
                    }
                    if let baths = request.bathrooms {
                        DetailRow(icon: "shower", label: "Bathrooms", value: "\(baths)")
                    }
                    if let sqft = request.squareFootage {
                        DetailRow(icon: "ruler", label: "Sq. Footage", value: "\(sqft)")
                    }
                }

                DetailSection(title: "Service") {
                    DetailRow(icon: "sparkles", label: "Type", value: request.serviceType.capitalized)
                    if let price = request.priceValue {
                        DetailRow(icon: "dollarsign.circle", label: "Price", value: "$\(String(format: "%.0f", price))")
                    }
                }

                // Show existing review or rate button
                if let review {
                    DetailSection(title: "Your Rating") {
                        HStack(spacing: 4) {
                            ForEach(1...5, id: \.self) { i in
                                Image(systemName: i <= review.rating ? "star.fill" : "star")
                                    .foregroundStyle(i <= review.rating ? .yellow : .gray.opacity(0.3))
                            }
                            Spacer()
                            Text("\(review.rating)/5")
                                .font(.subheadline.bold())
                        }
                        if let comment = review.comment, !comment.isEmpty {
                            Text(comment)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                } else if request.status == "completed" {
                    Button {
                        showRating = true
                    } label: {
                        Label("Rate This Service", systemImage: "star.fill")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.yellow.gradient)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Booking Details")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showRating) {
            RateServiceView(serviceRequestId: request.id)
        }
    }
}

struct StatusTimeline: View {
    let currentStatus: String
    let statuses = ["pending", "broadcasting", "assigned", "in_progress", "completed"]

    var currentIndex: Int {
        statuses.firstIndex(of: currentStatus) ?? 0
    }

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<statuses.count, id: \.self) { index in
                VStack(spacing: 4) {
                    Circle()
                        .fill(index <= currentIndex ? Color.clientPrimary : Color.gray.opacity(0.3))
                        .frame(width: 12, height: 12)
                    Text(statusLabel(statuses[index]))
                        .font(.system(size: 9))
                        .foregroundStyle(index <= currentIndex ? .primary : .secondary)
                }
                if index < statuses.count - 1 {
                    Rectangle()
                        .fill(index < currentIndex ? Color.clientPrimary : Color.gray.opacity(0.3))
                        .frame(height: 2)
                }
            }
        }
        .padding(.horizontal)
    }

    func statusLabel(_ status: String) -> String {
        switch status {
        case "pending": return "Pending"
        case "broadcasting": return "Finding"
        case "assigned": return "Matched"
        case "in_progress": return "Cleaning"
        case "completed": return "Done"
        default: return status
        }
    }
}
