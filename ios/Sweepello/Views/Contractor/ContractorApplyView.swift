import SwiftUI

struct ContractorApplyView: View {
    @Environment(\.dismiss) var dismiss
    @State private var currentStep = 0

    // Step 1: Personal Info
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var city = ""
    @State private var zipCode = ""
    @State private var serviceZipCodes = ""

    // Step 2: Experience
    @State private var yearsExperience = ""
    @State private var selectedCleaningTypes: Set<String> = []
    @State private var references = ""

    // Step 3: Business Info
    @State private var isInsured = false
    @State private var hasOwnSupplies = false

    // Step 4: Availability
    @State private var selectedDays: Set<String> = []
    @State private var availableHours = ""

    // Step 5: Agreement
    @State private var agreementAcknowledged = false

    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    let steps = [
        StepInfo(icon: "person.circle", title: "Personal Info"),
        StepInfo(icon: "briefcase", title: "Experience"),
        StepInfo(icon: "building.2", title: "Business Info"),
        StepInfo(icon: "clock", title: "Availability"),
        StepInfo(icon: "doc.text", title: "Agreement"),
    ]

    let cleaningTypeOptions = [
        "Residential",
        "Airbnb / Vacation Rental",
        "Commercial",
        "Move-In/Move-Out",
        "Deep Clean",
    ]

    let dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Logo + Title
                VStack(spacing: 8) {
                    Image("SweepelloLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 140)
                    Text("Contractor Application")
                        .font(.title2.bold())
                    Text("Join our network of professional cleaners")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)
                .padding(.bottom, 16)

                // Step Indicator
                stepIndicator
                    .padding(.horizontal)
                    .padding(.bottom, 16)

                // Step Content
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        stepHeader

                        switch currentStep {
                        case 0: personalInfoStep
                        case 1: experienceStep
                        case 2: businessInfoStep
                        case 3: availabilityStep
                        case 4: agreementStep
                        default: EmptyView()
                        }

                        // Navigation buttons
                        navigationButtons
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
                    .padding(.horizontal)
                    .padding(.bottom, 20)
                }
                .background(Color(.systemGroupedBackground))

                // Sign in link
                if currentStep == 0 {
                    HStack(spacing: 4) {
                        Text("Already approved?")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Button("Sign in here") { dismiss() }
                            .font(.caption.bold())
                            .foregroundStyle(Color.sweepelloPrimary)
                    }
                    .padding(.bottom, 12)
                }
            }
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

    // MARK: - Step Indicator

    private var stepIndicator: some View {
        HStack(spacing: 0) {
            ForEach(0..<steps.count, id: \.self) { index in
                VStack(spacing: 6) {
                    ZStack {
                        Circle()
                            .fill(index <= currentStep ? Color.sweepelloPrimary.opacity(0.15) : Color(.systemGroupedBackground))
                            .frame(width: 36, height: 36)
                        Image(systemName: steps[index].icon)
                            .font(.system(size: 14))
                            .foregroundStyle(index <= currentStep ? Color.sweepelloPrimary : Color.secondary.opacity(0.5))
                    }
                    Text(steps[index].title)
                        .font(.system(size: 9))
                        .foregroundStyle(index <= currentStep ? Color.primary : Color.secondary.opacity(0.5))
                }
                .frame(maxWidth: .infinity)

                if index < steps.count - 1 {
                    Rectangle()
                        .fill(index < currentStep ? Color.sweepelloPrimary : Color(.systemGroupedBackground))
                        .frame(height: 2)
                        .padding(.bottom, 20)
                }
            }
        }
    }

    // MARK: - Step Header

    private var stepHeader: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Image(systemName: steps[currentStep].icon)
                    .foregroundStyle(Color.sweepelloPrimary)
                Text("Step \(currentStep + 1) of 5 — \(steps[currentStep].title)")
                    .font(.headline)
            }
            Text(stepSubtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var stepSubtitle: String {
        switch currentStep {
        case 0: return "Tell us a bit about yourself and where you're located."
        case 1: return "Share your cleaning experience and specialties."
        case 2: return "Tell us about your business setup."
        case 3: return "When are you available to work?"
        case 4: return "Review and accept the terms to submit."
        default: return ""
        }
    }

    // MARK: - Step 1: Personal Info

    private var personalInfoStep: some View {
        VStack(spacing: 16) {
            HStack(spacing: 12) {
                LabeledField(label: "First Name", placeholder: "Jane", text: $firstName)
                LabeledField(label: "Last Name", placeholder: "Smith", text: $lastName)
            }
            LabeledField(label: "Email Address", placeholder: "jane@email.com", text: $email, keyboardType: .emailAddress)
            LabeledField(label: "Phone Number", placeholder: "(732) 555-0100", text: $phone, keyboardType: .phonePad)
            HStack(spacing: 12) {
                LabeledField(label: "City", placeholder: "Toms River", text: $city)
                LabeledField(label: "Your Zip Code", placeholder: "08753", text: $zipCode, keyboardType: .numberPad)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("Zip Codes You Can Service")
                    .font(.subheadline.bold())
                TextField("08753, 08701, 08723 (comma separated)", text: $serviceZipCodes)
                    .textFieldStyle(.roundedBorder)
                Text("Enter all zip codes you're willing to travel to for jobs.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Step 2: Experience

    private var experienceStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Years of Experience")
                    .font(.subheadline.bold())
                TextField("3", text: $yearsExperience)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Types of Cleaning")
                    .font(.subheadline.bold())
                Text("Select all that apply")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                ForEach(cleaningTypeOptions, id: \.self) { type in
                    Button {
                        if selectedCleaningTypes.contains(type) {
                            selectedCleaningTypes.remove(type)
                        } else {
                            selectedCleaningTypes.insert(type)
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: selectedCleaningTypes.contains(type) ? "checkmark.square.fill" : "square")
                                .foregroundStyle(selectedCleaningTypes.contains(type) ? Color.sweepelloPrimary : .secondary)
                            Text(type)
                                .foregroundStyle(.primary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("References (Optional)")
                    .font(.subheadline.bold())
                TextEditor(text: $references)
                    .frame(minHeight: 70)
                    .padding(4)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.systemGray4), lineWidth: 1))
                Text("Name, phone, or company — list any professional references you have")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Step 3: Business Info

    private var businessInfoStep: some View {
        VStack(alignment: .leading, spacing: 20) {
            Button {
                isInsured.toggle()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: isInsured ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundStyle(isInsured ? Color.sweepelloPrimary : .secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("I have liability insurance")
                            .font(.subheadline.bold())
                            .foregroundStyle(.primary)
                        Text("Recommended but not required to apply. You'll provide policy details during onboarding.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .buttonStyle(.plain)

            Button {
                hasOwnSupplies.toggle()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: hasOwnSupplies ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundStyle(hasOwnSupplies ? Color.sweepelloPrimary : .secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("I have my own cleaning supplies")
                            .font(.subheadline.bold())
                            .foregroundStyle(.primary)
                        Text("Vacuum, mop, cleaning products, etc.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .buttonStyle(.plain)

            HStack(spacing: 8) {
                Image(systemName: "info.circle")
                    .foregroundStyle(Color.sweepelloPrimary)
                Text("Neither of the above is required to apply. We evaluate all applicants holistically based on experience, professionalism, and availability.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(Color.sweepelloPrimary.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Step 4: Availability

    private var availabilityStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Available Days")
                    .font(.subheadline.bold())
                Text("Select all days you can work")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    ForEach(dayOptions, id: \.self) { day in
                        Button {
                            if selectedDays.contains(day) {
                                selectedDays.remove(day)
                            } else {
                                selectedDays.insert(day)
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: selectedDays.contains(day) ? "checkmark.square.fill" : "square")
                                    .foregroundStyle(selectedDays.contains(day) ? Color.sweepelloPrimary : .secondary)
                                Text(day)
                                    .foregroundStyle(.primary)
                                Spacer()
                            }
                            .padding(.vertical, 6)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Available Hours")
                    .font(.subheadline.bold())
                TextField("e.g. 8am – 5pm, flexible", text: $availableHours)
                    .textFieldStyle(.roundedBorder)
            }
        }
    }

    // MARK: - Step 5: Agreement

    private var agreementStep: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Text("Independent Contractor Acknowledgment")
                    .font(.subheadline.bold())

                VStack(alignment: .leading, spacing: 8) {
                    AgreementBullet(text: "You will operate as an independent contractor, not an employee of Sweepello.")
                    AgreementBullet(text: "You are responsible for your own taxes as a 1099 contractor.")
                    AgreementBullet(text: "Sweepello acts as a dispatch broker connecting you with clients.")
                    AgreementBullet(text: "You are free to accept or decline any job offers.")
                    AgreementBullet(text: "Your approval is not guaranteed and Sweepello reserves the right to reject any application.")
                    AgreementBullet(text: "Approved contractors will complete a full onboarding process including a W-9 and subcontractor agreement before receiving any assignments.")
                }
            }
            .padding()
            .background(Color(.systemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Button {
                agreementAcknowledged.toggle()
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: agreementAcknowledged ? "checkmark.square.fill" : "square")
                        .font(.title3)
                        .foregroundStyle(agreementAcknowledged ? Color.sweepelloPrimary : .secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("I acknowledge and agree to the above terms")
                            .font(.subheadline.bold())
                            .foregroundStyle(.primary)
                        Text("You will sign the full subcontractor agreement and W-9 during onboarding if approved.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Navigation

    private var navigationButtons: some View {
        HStack(spacing: 12) {
            if currentStep > 0 {
                Button {
                    withAnimation { currentStep -= 1 }
                } label: {
                    HStack {
                        Image(systemName: "arrow.left")
                        Text("Back")
                    }
                    .font(.headline)
                    .foregroundStyle(Color.sweepelloPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.sweepelloPrimary.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            if currentStep < 4 {
                Button {
                    withAnimation { currentStep += 1 }
                } label: {
                    HStack {
                        Text("Next")
                        Image(systemName: "arrow.right")
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(canProceed ? Color.contractorPrimary : Color.gray)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!canProceed)
            } else {
                Button {
                    submitApplication()
                } label: {
                    HStack {
                        if isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "paperplane.fill")
                            Text("Submit Application")
                        }
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(canSubmit ? Color.contractorPrimary : Color.gray)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(!canSubmit || isSubmitting)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Validation

    private var canProceed: Bool {
        switch currentStep {
        case 0: return !firstName.isEmpty && !lastName.isEmpty && !email.isEmpty && !phone.isEmpty && !city.isEmpty && !zipCode.isEmpty && !serviceZipCodes.isEmpty
        case 1: return !yearsExperience.isEmpty && !selectedCleaningTypes.isEmpty
        case 2: return true // Insurance and supplies are optional
        case 3: return !selectedDays.isEmpty && !availableHours.isEmpty
        default: return true
        }
    }

    private var canSubmit: Bool {
        canProceed && agreementAcknowledged
    }

    // MARK: - Submit

    private func submitApplication() {
        isSubmitting = true
        let application = CreateContractorApplication(
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            city: city,
            zipCode: zipCode,
            serviceZipCodes: serviceZipCodes,
            yearsExperience: Int(yearsExperience) ?? 0,
            cleaningTypes: selectedCleaningTypes.joined(separator: ", "),
            isInsured: isInsured,
            hasOwnSupplies: hasOwnSupplies,
            references: references.isEmpty ? nil : references,
            availableDays: selectedDays.sorted { dayOptions.firstIndex(of: $0)! < dayOptions.firstIndex(of: $1)! }.joined(separator: ", "),
            availableHours: availableHours,
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

// MARK: - Supporting Views

struct StepInfo {
    let icon: String
    let title: String
}

struct LabeledField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.subheadline.bold())
            TextField(placeholder, text: $text)
                .textFieldStyle(.roundedBorder)
                .keyboardType(keyboardType)
        }
    }
}

struct AgreementBullet: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
                .foregroundStyle(.secondary)
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
