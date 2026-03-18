import SwiftUI

struct ContractorApplyView: View {
    @Environment(\.dismiss) var dismiss
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var city = ""
    @State private var zipCode = ""
    @State private var serviceZipCodes = ""
    @State private var yearsExperience = 0
    @State private var cleaningTypes = ""
    @State private var isInsured = false
    @State private var hasOwnSupplies = false
    @State private var references = ""
    @State private var availableDays = ""
    @State private var availableHours = ""
    @State private var agreementAcknowledged = false

    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Personal Information") {
                    TextField("First Name", text: $firstName)
                    TextField("Last Name", text: $lastName)
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                }

                Section("Location") {
                    TextField("City", text: $city)
                    TextField("ZIP Code", text: $zipCode)
                        .keyboardType(.numberPad)
                    TextField("Service ZIP Codes (comma-separated)", text: $serviceZipCodes)
                }

                Section("Experience") {
                    Stepper("Years of Experience: \(yearsExperience)", value: $yearsExperience, in: 0...30)
                    TextField("Cleaning Types (e.g., Airbnb, Residential, Commercial)", text: $cleaningTypes)
                    Toggle("I have liability insurance", isOn: $isInsured)
                    Toggle("I have my own supplies", isOn: $hasOwnSupplies)
                }

                Section("Availability") {
                    TextField("Available Days (e.g., Mon-Fri)", text: $availableDays)
                    TextField("Available Hours (e.g., 8am-6pm)", text: $availableHours)
                }

                Section("References (Optional)") {
                    TextEditor(text: $references)
                        .frame(minHeight: 60)
                }

                Section {
                    Toggle("I acknowledge that this is an application for independent contractor work", isOn: $agreementAcknowledged)
                        .font(.caption)
                }

                Section {
                    Button {
                        submitApplication()
                    } label: {
                        HStack {
                            Spacer()
                            if isSubmitting {
                                ProgressView().tint(.white)
                            } else {
                                Text("Submit Application")
                                    .font(.headline)
                            }
                            Spacer()
                        }
                        .foregroundStyle(.white)
                        .padding(.vertical, 4)
                    }
                    .listRowBackground(Color.contractorPrimary)
                    .disabled(!canSubmit || isSubmitting)
                }
            }
            .navigationTitle("Apply as Cleaner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Application Submitted!", isPresented: $showSuccess) {
                Button("Done") { dismiss() }
            } message: {
                Text("Thank you for applying! We'll review your application and get back to you soon.")
            }
            .alert("Error", isPresented: .init(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private var canSubmit: Bool {
        !firstName.isEmpty && !lastName.isEmpty && !email.isEmpty && !phone.isEmpty &&
        !city.isEmpty && !zipCode.isEmpty && !serviceZipCodes.isEmpty && !cleaningTypes.isEmpty &&
        !availableDays.isEmpty && !availableHours.isEmpty && agreementAcknowledged
    }

    private func submitApplication() {
        isSubmitting = true
        let application = CreateContractorApplication(
            firstName: firstName, lastName: lastName, email: email, phone: phone,
            city: city, zipCode: zipCode, serviceZipCodes: serviceZipCodes,
            yearsExperience: yearsExperience, cleaningTypes: cleaningTypes,
            isInsured: isInsured, hasOwnSupplies: hasOwnSupplies,
            references: references.isEmpty ? nil : references,
            availableDays: availableDays, availableHours: availableHours,
            agreementAcknowledged: agreementAcknowledged
        )
        Task {
            do {
                let _: ContractorApplication = try await APIClient.shared.post("/api/contractor-applications", body: application)
                showSuccess = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isSubmitting = false
        }
    }
}
