import SwiftUI

struct ContractorOnboardingView: View {
    let onComplete: () -> Void
    @State private var currentStep: OnboardingStep = .businessInfo
    @State private var onboardingData: ContractorOnboardingData?

    // Step 1: Business Info
    @State private var fullName = ""
    @State private var businessName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var city = ""
    @State private var state = "NJ"
    @State private var zipCode = ""
    @State private var serviceZipCodes = ""

    // Step 2: Agreement
    @State private var agreementSignature = ""
    @State private var agreementAccepted = false

    // Step 3: W-9
    @State private var w9Signature = ""

    // Step 4: Insurance
    @State private var insuranceProvider = ""
    @State private var policyNumber = ""
    @State private var expirationDate = ""
    @State private var skipInsurance = false

    @State private var isSubmitting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress Bar
                progressBar

                // Step Content
                ScrollView {
                    VStack(spacing: 24) {
                        stepHeader
                        stepContent
                    }
                    .padding()
                }

                // Navigation Buttons
                navigationButtons
            }
            .navigationTitle("Onboarding")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Error", isPresented: .init(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    // MARK: - Progress Bar

    private var progressBar: some View {
        HStack(spacing: 4) {
            ForEach(OnboardingStep.allCases, id: \.rawValue) { step in
                VStack(spacing: 4) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(step.rawValue <= currentStep.rawValue ? Color.contractorPrimary : Color.gray.opacity(0.3))
                        .frame(height: 4)
                    Text(step.title)
                        .font(.system(size: 9))
                        .foregroundStyle(step.rawValue <= currentStep.rawValue ? .primary : .secondary)
                }
            }
        }
        .padding()
    }

    // MARK: - Step Header

    private var stepHeader: some View {
        VStack(spacing: 8) {
            Image(systemName: currentStep.iconName)
                .font(.system(size: 40))
                .foregroundStyle(Color.contractorPrimary)
            Text("Step \(currentStep.rawValue) of 5")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(currentStep.title)
                .font(.title2.bold())
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        switch currentStep {
        case .businessInfo:
            businessInfoForm
        case .agreement:
            agreementForm
        case .w9:
            w9Form
        case .insurance:
            insuranceForm
        case .stripeConnect:
            stripeConnectView
        }
    }

    private var businessInfoForm: some View {
        VStack(spacing: 16) {
            FormField(label: "Full Name", text: $fullName)
            FormField(label: "Business Name (Optional)", text: $businessName)
            FormField(label: "Email", text: $email, keyboardType: .emailAddress)
            FormField(label: "Phone", text: $phone, keyboardType: .phonePad)
            FormField(label: "Address", text: $address)
            HStack {
                FormField(label: "City", text: $city)
                FormField(label: "State", text: $state)
                    .frame(width: 80)
            }
            FormField(label: "ZIP Code", text: $zipCode, keyboardType: .numberPad)
            FormField(label: "Service ZIP Codes (comma-separated)", text: $serviceZipCodes)
        }
    }

    private var agreementForm: some View {
        VStack(spacing: 16) {
            ScrollView {
                Text("""
                INDEPENDENT SUBCONTRACTOR AGREEMENT

                This Agreement is entered into between Sweepello LLC ("Company") and the undersigned independent contractor ("Contractor").

                1. INDEPENDENT CONTRACTOR STATUS: Contractor acknowledges that they are an independent contractor and not an employee of the Company.

                2. SERVICES: Contractor agrees to provide cleaning services as requested by the Company.

                3. PAYMENT: Contractor will be paid per job at the agreed-upon rate.

                4. INSURANCE: Contractor is responsible for maintaining adequate liability insurance.

                5. TERMINATION: Either party may terminate this agreement at any time with written notice.
                """)
                .font(.caption)
                .padding()
            }
            .frame(height: 200)
            .background(Color(.systemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))

            Toggle("I agree to the terms above", isOn: $agreementAccepted)

            if agreementAccepted {
                FormField(label: "Signature (Type Full Name)", text: $agreementSignature)
            }
        }
    }

    private var w9Form: some View {
        VStack(spacing: 16) {
            Text("By signing below, you certify that the information provided is correct and you authorize Sweepello to report payments to the IRS.")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            FormField(label: "Electronic Signature (Type Full Name)", text: $w9Signature)
        }
    }

    private var insuranceForm: some View {
        VStack(spacing: 16) {
            Toggle("I have liability insurance", isOn: .init(
                get: { !skipInsurance },
                set: { skipInsurance = !$0 }
            ))

            if !skipInsurance {
                FormField(label: "Insurance Provider", text: $insuranceProvider)
                FormField(label: "Policy Number", text: $policyNumber)
                FormField(label: "Expiration Date", text: $expirationDate)
            } else {
                Text("Insurance is recommended but not required. You can add it later.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var stripeConnectView: some View {
        VStack(spacing: 16) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.contractorPrimary)

            Text("Set up your payment account to receive direct deposits for completed jobs.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                setupStripe()
            } label: {
                Label("Set Up Stripe Connect", systemImage: "link")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.indigo)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Navigation

    private var navigationButtons: some View {
        HStack(spacing: 16) {
            if currentStep.rawValue > 1 {
                Button {
                    withAnimation {
                        if let prev = OnboardingStep(rawValue: currentStep.rawValue - 1) {
                            currentStep = prev
                        }
                    }
                } label: {
                    Text("Back")
                        .font(.headline)
                        .foregroundStyle(Color.contractorPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.contractorPrimary.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            Button {
                submitCurrentStep()
            } label: {
                HStack {
                    if isSubmitting {
                        ProgressView().tint(.white)
                    } else {
                        Text(currentStep == .stripeConnect ? "Complete" : "Next")
                    }
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(canProceed ? Color.contractorPrimary : Color.gray)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!canProceed || isSubmitting)
        }
        .padding()
    }

    private var canProceed: Bool {
        switch currentStep {
        case .businessInfo: return !fullName.isEmpty && !email.isEmpty && !phone.isEmpty && !address.isEmpty && !city.isEmpty && !zipCode.isEmpty
        case .agreement: return agreementAccepted && !agreementSignature.isEmpty
        case .w9: return !w9Signature.isEmpty
        case .insurance: return skipInsurance || !insuranceProvider.isEmpty
        case .stripeConnect: return true
        }
    }

    private func submitCurrentStep() {
        isSubmitting = true
        Task {
            do {
                switch currentStep {
                case .businessInfo:
                    let body = BusinessInfoRequest(
                        fullName: fullName, businessName: businessName.isEmpty ? nil : businessName,
                        email: email, phone: phone, address: address, city: city, state: state,
                        zipCode: zipCode, serviceZipCodes: serviceZipCodes.isEmpty ? nil : serviceZipCodes
                    )
                    let _: ContractorOnboardingData = try await APIClient.shared.post("/api/contractor/onboarding", body: body)
                case .agreement:
                    struct AgreementBody: Codable { let signed: Bool; let signatureName: String }
                    let _: ContractorOnboardingData = try await APIClient.shared.post("/api/contractor/onboarding/agreement", body: AgreementBody(signed: true, signatureName: agreementSignature))
                case .w9:
                    struct W9Body: Codable { let signatureName: String }
                    let _: ContractorOnboardingData = try await APIClient.shared.post("/api/contractor/onboarding/w9", body: W9Body(signatureName: w9Signature))
                case .insurance:
                    struct InsuranceBody: Codable { let provider: String?; let policyNumber: String?; let expirationDate: String?; let hasInsurance: Bool }
                    let _: ContractorOnboardingData = try await APIClient.shared.post("/api/contractor/onboarding/insurance", body: InsuranceBody(
                        provider: skipInsurance ? nil : insuranceProvider,
                        policyNumber: skipInsurance ? nil : policyNumber,
                        expirationDate: skipInsurance ? nil : expirationDate,
                        hasInsurance: !skipInsurance
                    ))
                case .stripeConnect:
                    let _: ContractorOnboardingData = try await APIClient.shared.post("/api/contractor/onboarding/complete")
                    onComplete()
                    isSubmitting = false
                    return
                }

                withAnimation {
                    if let next = OnboardingStep(rawValue: currentStep.rawValue + 1) {
                        currentStep = next
                    }
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isSubmitting = false
        }
    }

    private func setupStripe() {
        Task {
            struct StripeResponse: Codable { let url: String }
            if let response: StripeResponse = try? await APIClient.shared.post("/api/contractor/onboarding/stripe-connect") {
                if let url = URL(string: response.url) {
                    UIApplication.shared.open(url)
                }
            }
        }
    }
}

struct FormField: View {
    let label: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField(label, text: $text)
                .keyboardType(keyboardType)
                .textFieldStyle(.roundedBorder)
        }
    }
}
