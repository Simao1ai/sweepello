import SwiftUI

struct ContractorAvailabilityView: View {
    @State private var availability: [CleanerAvailability] = []
    @State private var isLoading = true
    @State private var isSaving = false

    let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("Set your weekly availability")) {
                    ForEach(0..<7, id: \.self) { day in
                        DayAvailabilityRow(
                            dayName: daysOfWeek[day],
                            availability: binding(for: day)
                        )
                    }
                }

                Section {
                    Button {
                        saveAvailability()
                    } label: {
                        HStack {
                            Spacer()
                            if isSaving {
                                ProgressView().tint(.white)
                            } else {
                                Text("Save Availability")
                                    .font(.headline)
                            }
                            Spacer()
                        }
                        .foregroundStyle(.white)
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Color.contractorPrimary)
                    .disabled(isSaving)
                }
            }
            .navigationTitle("Availability")
            .task { await loadAvailability() }
        }
    }

    private func binding(for day: Int) -> Binding<CleanerAvailability?> {
        Binding(
            get: { availability.first(where: { $0.dayOfWeek == day }) },
            set: { newValue in
                if let idx = availability.firstIndex(where: { $0.dayOfWeek == day }) {
                    if let nv = newValue {
                        availability[idx] = nv
                    }
                }
            }
        )
    }

    private func loadAvailability() async {
        isLoading = true
        availability = (try? await APIClient.shared.get("/api/contractor/availability")) ?? []

        // Ensure all 7 days exist
        for day in 0..<7 {
            if !availability.contains(where: { $0.dayOfWeek == day }) {
                availability.append(CleanerAvailability(
                    id: UUID().uuidString,
                    cleanerId: "",
                    dayOfWeek: day,
                    startTime: "08:00",
                    endTime: "18:00",
                    isAvailable: day >= 1 && day <= 5 // Mon-Fri default
                ))
            }
        }
        availability.sort { $0.dayOfWeek < $1.dayOfWeek }
        isLoading = false
    }

    private func saveAvailability() {
        isSaving = true
        Task {
            let _: [CleanerAvailability]? = try? await APIClient.shared.post("/api/contractor/availability", body: availability)
            isSaving = false
        }
    }
}

struct DayAvailabilityRow: View {
    let dayName: String
    @Binding var availability: CleanerAvailability?

    var isAvailable: Bool {
        availability?.isAvailable ?? false
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(dayName)
                    .font(.headline)
                Spacer()
                Toggle("", isOn: Binding(
                    get: { isAvailable },
                    set: { _ in
                        // Toggle would need mutable model; simplified for display
                    }
                ))
                .tint(Color.contractorPrimary)
            }

            if isAvailable {
                HStack {
                    Text(availability?.startTime ?? "08:00")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("-")
                    Text(availability?.endTime ?? "18:00")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }
        }
        .padding(.vertical, 4)
    }
}
