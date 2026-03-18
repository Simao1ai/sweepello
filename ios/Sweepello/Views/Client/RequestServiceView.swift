import SwiftUI

struct RequestServiceView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var propertyAddress = ""
    @State private var city = ""
    @State private var zipCode = ""
    @State private var propertyType: PropertyType = .airbnb
    @State private var serviceType: ServiceType = .standard
    @State private var bedrooms = 2
    @State private var bathrooms = 1
    @State private var squareFootage = ""
    @State private var hasBasement = false
    @State private var requestedDate = Date()
    @State private var preferredTime = "morning"
    @State private var specialInstructions = ""
    @State private var preferredCleanerId: String?

    @State private var estimatedPrice: Double?
    @State private var isSubmitting = false
    @State private var showConfirmation = false
    @State private var errorMessage: String?
    @State private var previousCleaners: [Cleaner] = []

    let timeSlots = ["morning", "afternoon", "evening"]

    var body: some View {
        NavigationStack {
            Form {
                // Property Details
                Section("Property Details") {
                    TextField("Property Address", text: $propertyAddress)
                    HStack {
                        TextField("City", text: $city)
                        TextField("ZIP Code", text: $zipCode)
                            .keyboardType(.numberPad)
                            .frame(width: 100)
                    }
                    Picker("Property Type", selection: $propertyType) {
                        ForEach(PropertyType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                    Stepper("Bedrooms: \(bedrooms)", value: $bedrooms, in: 1...10)
                    Stepper("Bathrooms: \(bathrooms)", value: $bathrooms, in: 1...10)
                    TextField("Square Footage", text: $squareFootage)
                        .keyboardType(.numberPad)
                    Toggle("Has Basement", isOn: $hasBasement)
                }

                // Service Type
                Section("Service Type") {
                    Picker("Service", selection: $serviceType) {
                        ForEach(ServiceType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)

                    switch serviceType {
                    case .standard:
                        Text("Regular cleaning for routine turnovers")
                            .font(.caption).foregroundStyle(.secondary)
                    case .deep:
                        Text("Thorough deep clean for seasonal refreshes")
                            .font(.caption).foregroundStyle(.secondary)
                    case .moveOut:
                        Text("Complete move-out cleaning")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }

                // Scheduling
                Section("Schedule") {
                    DatePicker("Date", selection: $requestedDate, in: Date()..., displayedComponents: .date)
                    Picker("Preferred Time", selection: $preferredTime) {
                        ForEach(timeSlots, id: \.self) { slot in
                            Text(slot.capitalized).tag(slot)
                        }
                    }
                }

                // Preferred Cleaner
                if !previousCleaners.isEmpty {
                    Section("Preferred Cleaner (Optional)") {
                        Picker("Select Cleaner", selection: $preferredCleanerId) {
                            Text("No preference").tag(nil as String?)
                            ForEach(previousCleaners) { cleaner in
                                HStack {
                                    Text(cleaner.name)
                                    Spacer()
                                    HStack(spacing: 2) {
                                        Image(systemName: "star.fill")
                                            .foregroundStyle(.yellow)
                                        Text(String(format: "%.1f", cleaner.ratingValue))
                                    }
                                    .font(.caption)
                                }
                                .tag(cleaner.id as String?)
                            }
                        }
                    }
                }

                // Notes
                Section("Special Instructions") {
                    TextEditor(text: $specialInstructions)
                        .frame(minHeight: 80)
                }

                // Price Estimate
                if let price = estimatedPrice {
                    Section("Estimated Price") {
                        HStack {
                            Text("Total")
                                .font(.headline)
                            Spacer()
                            Text("$\(String(format: "%.0f", price))")
                                .font(.title2.bold())
                                .foregroundStyle(Color.clientPrimary)
                        }
                    }
                }

                // Submit
                Section {
                    Button {
                        submitRequest()
                    } label: {
                        HStack {
                            Spacer()
                            if isSubmitting {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Request Cleaning")
                                    .font(.headline)
                            }
                            Spacer()
                        }
                        .foregroundStyle(.white)
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Color.clientPrimary)
                    .disabled(isSubmitting || propertyAddress.isEmpty || zipCode.isEmpty)
                }
            }
            .navigationTitle("Book a Clean")
            .onChange(of: squareFootage) { _, _ in fetchEstimate() }
            .onChange(of: serviceType) { _, _ in fetchEstimate() }
            .onChange(of: bedrooms) { _, _ in fetchEstimate() }
            .onChange(of: bathrooms) { _, _ in fetchEstimate() }
            .task {
                await loadPreviousCleaners()
            }
            .alert("Booking Confirmed!", isPresented: $showConfirmation) {
                Button("OK") { resetForm() }
            } message: {
                Text("We're matching you with the best available cleaner. You'll be notified when confirmed.")
            }
            .alert("Error", isPresented: .init(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private func fetchEstimate() {
        guard let sqft = Int(squareFootage), sqft > 0 else { return }
        Task {
            let items: [URLQueryItem] = [
                .init(name: "propertyType", value: propertyType.rawValue),
                .init(name: "serviceType", value: serviceType.rawValue),
                .init(name: "bedrooms", value: "\(bedrooms)"),
                .init(name: "bathrooms", value: "\(bathrooms)"),
                .init(name: "squareFootage", value: "\(sqft)")
            ]
            if let estimate: PricingEstimate = try? await APIClient.shared.get("/api/pricing-estimate", queryItems: items) {
                estimatedPrice = estimate.estimatedPrice
            }
        }
    }

    private func loadPreviousCleaners() async {
        previousCleaners = (try? await APIClient.shared.get("/api/client/previous-cleaners")) ?? []
    }

    private func submitRequest() {
        isSubmitting = true
        let formatter = ISO8601DateFormatter()
        let request = CreateServiceRequest(
            userId: authManager.userProfile?.userId ?? "",
            propertyAddress: propertyAddress,
            city: city.isEmpty ? nil : city,
            zipCode: zipCode.isEmpty ? nil : zipCode,
            propertyType: propertyType.rawValue,
            serviceType: serviceType.rawValue,
            bedrooms: bedrooms,
            bathrooms: bathrooms,
            basement: hasBasement,
            requestedDate: formatter.string(from: requestedDate),
            preferredTime: preferredTime,
            specialInstructions: specialInstructions.isEmpty ? nil : specialInstructions,
            squareFootage: Int(squareFootage),
            preferredCleanerId: preferredCleanerId,
            isOnDemand: false,
            surgeMultiplier: nil
        )

        Task {
            do {
                let _: ServiceRequest = try await APIClient.shared.post("/api/service-requests", body: request)
                showConfirmation = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isSubmitting = false
        }
    }

    private func resetForm() {
        propertyAddress = ""
        city = ""
        zipCode = ""
        squareFootage = ""
        specialInstructions = ""
        estimatedPrice = nil
        preferredCleanerId = nil
    }
}
