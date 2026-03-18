import Foundation

enum OnboardingStep: Int, CaseIterable {
    case businessInfo = 1
    case agreement = 2
    case w9 = 3
    case insurance = 4
    case stripeConnect = 5

    var title: String {
        switch self {
        case .businessInfo: return "Business Info"
        case .agreement: return "Agreement"
        case .w9: return "W-9 Tax Form"
        case .insurance: return "Insurance"
        case .stripeConnect: return "Payment Setup"
        }
    }

    var iconName: String {
        switch self {
        case .businessInfo: return "building.2"
        case .agreement: return "doc.text"
        case .w9: return "signature"
        case .insurance: return "shield.checkered"
        case .stripeConnect: return "creditcard"
        }
    }
}

struct ContractorOnboardingData: Codable, Identifiable {
    let id: String
    let userId: String
    let fullName: String
    let businessName: String?
    let email: String
    let phone: String
    let address: String
    let city: String
    let state: String
    let zipCode: String
    let serviceZipCodes: String?
    let agreementSigned: Bool
    let agreementSignedAt: String?
    let agreementSignatureName: String?
    let agreementDeclined: Bool
    let w9Signed: Bool
    let w9SignedAt: String?
    let w9SignatureName: String?
    let insuranceProvider: String?
    let insurancePolicyNumber: String?
    let insuranceExpirationDate: String?
    let hasInsurance: Bool
    let stripeAccountId: String?
    let stripeOnboardingComplete: Bool
    let onboardingStatus: String
    let createdAt: String?
    let updatedAt: String?

    var currentStep: OnboardingStep {
        if fullName.isEmpty { return .businessInfo }
        if !agreementSigned && !agreementDeclined { return .agreement }
        if !w9Signed { return .w9 }
        if !hasInsurance && insuranceProvider == nil { return .insurance }
        if !stripeOnboardingComplete { return .stripeConnect }
        return .stripeConnect
    }

    var isComplete: Bool {
        onboardingStatus == "complete"
    }
}

struct BusinessInfoRequest: Codable {
    let fullName: String
    let businessName: String?
    let email: String
    let phone: String
    let address: String
    let city: String
    let state: String
    let zipCode: String
    let serviceZipCodes: String?
}
