import SwiftUI

struct AdminScheduleView: View {
    @State private var selectedDate = Date()
    @State private var jobs: [Job] = []
    @State private var requests: [ServiceRequest] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Calendar
                DatePicker("Select Date", selection: $selectedDate, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .tint(Color.adminPrimary)
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .black.opacity(0.05), radius: 4, y: 2)

                // Jobs for selected date
                VStack(alignment: .leading, spacing: 12) {
                    Text("Scheduled Jobs")
                        .font(.headline)

                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 60)
                    } else if jobs.isEmpty {
                        Text("No jobs scheduled for this date")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity, minHeight: 60)
                    } else {
                        ForEach(jobs) { job in
                            HStack(spacing: 12) {
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(jobStatusColor(job.status))
                                    .frame(width: 4)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(job.propertyAddress)
                                        .font(.subheadline.bold())
                                        .lineLimit(1)
                                    HStack {
                                        StatusBadge(status: job.jobStatus.displayName, color: jobStatusColor(job.status))
                                        Text("$\(job.price)")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                            }
                            .padding()
                            .background(Color(.systemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Schedule")
        .task { await loadCalendarData() }
        .onChange(of: selectedDate) { _, _ in
            Task { await loadCalendarData() }
        }
    }

    private func loadCalendarData() async {
        isLoading = true
        let formatter = ISO8601DateFormatter()
        let dateStr = formatter.string(from: selectedDate)
        let items: [URLQueryItem] = [.init(name: "date", value: dateStr)]
        jobs = (try? await APIClient.shared.get("/api/jobs", queryItems: items)) ?? []
        isLoading = false
    }
}
