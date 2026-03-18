import SwiftUI

struct AdminCleanersView: View {
    @State private var cleaners: [Cleaner] = []
    @State private var isLoading = true
    @State private var searchText = ""

    var filteredCleaners: [Cleaner] {
        if searchText.isEmpty { return cleaners }
        return cleaners.filter {
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
                    List(filteredCleaners) { cleaner in
                        NavigationLink {
                            CleanerDetailView(cleaner: cleaner)
                        } label: {
                            CleanerRow(cleaner: cleaner)
                        }
                    }
                    .listStyle(.plain)
                    .searchable(text: $searchText, prompt: "Search cleaners...")
                }
            }
            .navigationTitle("Cleaners")
            .refreshable { await loadCleaners() }
            .task { await loadCleaners() }
        }
    }

    private func loadCleaners() async {
        isLoading = true
        cleaners = (try? await APIClient.shared.get("/api/cleaners")) ?? []
        isLoading = false
    }
}

struct CleanerRow: View {
    let cleaner: Cleaner

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            ZStack {
                Circle()
                    .fill(cleaner.isActive ? Color.contractorPrimary.opacity(0.15) : Color.gray.opacity(0.15))
                    .frame(width: 44, height: 44)
                Text(String(cleaner.name.prefix(1)))
                    .font(.headline)
                    .foregroundStyle(cleaner.isActive ? Color.contractorPrimary : .gray)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(cleaner.name)
                        .font(.subheadline.bold())
                    if cleaner.isFeatured ?? false {
                        Image(systemName: "star.circle.fill")
                            .foregroundStyle(.yellow)
                            .font(.caption)
                    }
                    if cleaner.isOnline ?? false {
                        Circle()
                            .fill(.green)
                            .frame(width: 8, height: 8)
                    }
                }
                HStack(spacing: 12) {
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(.yellow)
                        Text(cleaner.rating ?? "5.0")
                    }
                    Text("\(cleaner.totalJobs ?? 0) jobs")
                    Text("\(cleaner.onTimePercent ?? 100)% on-time")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 2)
    }
}

struct CleanerDetailView: View {
    let cleaner: Cleaner

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Profile Header
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(Color.contractorPrimary.opacity(0.15))
                            .frame(width: 80, height: 80)
                        Text(String(cleaner.name.prefix(1)))
                            .font(.largeTitle.bold())
                            .foregroundStyle(Color.contractorPrimary)
                    }
                    Text(cleaner.name)
                        .font(.title2.bold())

                    HStack(spacing: 4) {
                        Image(systemName: "star.fill").foregroundStyle(.yellow)
                        Text(cleaner.rating ?? "5.0").font(.headline)
                        Text("(\(cleaner.totalJobs ?? 0) jobs)").foregroundStyle(.secondary)
                    }

                    StatusBadge(status: cleaner.status.capitalized, color: cleaner.isActive ? .green : .red)
                }

                // Scorecard
                DetailSection(title: "Performance Scorecard") {
                    DetailRow(icon: "star.fill", label: "Rating", value: cleaner.rating ?? "5.0")
                    DetailRow(icon: "clock", label: "On-Time %", value: "\(cleaner.onTimePercent ?? 100)%")
                    DetailRow(icon: "briefcase", label: "Total Jobs", value: "\(cleaner.totalJobs ?? 0)")
                    if let revenue = cleaner.totalRevenue {
                        DetailRow(icon: "dollarsign.circle", label: "Total Revenue", value: "$\(revenue)")
                    }
                }

                // Contact
                DetailSection(title: "Contact") {
                    if let email = cleaner.email {
                        DetailRow(icon: "envelope", label: "Email", value: email)
                    }
                    DetailRow(icon: "phone", label: "Phone", value: cleaner.phone)
                }

                // Service Area
                DetailSection(title: "Service Area") {
                    if let area = cleaner.serviceArea {
                        DetailRow(icon: "map", label: "Area", value: area)
                    }
                    if let zips = cleaner.zipCodes {
                        DetailRow(icon: "location", label: "ZIP Codes", value: zips)
                    }
                }
            }
            .padding()
        }
        .navigationTitle(cleaner.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
