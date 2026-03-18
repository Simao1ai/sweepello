import SwiftUI

struct RateServiceView: View {
    let serviceRequestId: String
    @Environment(\.dismiss) var dismiss
    @State private var rating = 0
    @State private var comment = ""
    @State private var isSubmitting = false
    @State private var showThankYou = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 32) {
                Spacer()

                VStack(spacing: 16) {
                    Image(systemName: "star.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.yellow)

                    Text("How was your cleaning?")
                        .font(.title2.bold())

                    // Star Rating
                    HStack(spacing: 12) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= rating ? "star.fill" : "star")
                                .font(.title)
                                .foregroundStyle(star <= rating ? .yellow : .gray.opacity(0.3))
                                .onTapGesture {
                                    withAnimation(.spring(response: 0.3)) {
                                        rating = star
                                    }
                                }
                        }
                    }

                    if rating > 0 {
                        Text(ratingLabel)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                // Comment
                VStack(alignment: .leading, spacing: 8) {
                    Text("Leave a comment (optional)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    TextEditor(text: $comment)
                        .frame(height: 100)
                        .padding(8)
                        .background(Color(.systemGroupedBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal)

                Spacer()

                // Submit
                Button {
                    submitRating()
                } label: {
                    HStack {
                        if isSubmitting {
                            ProgressView().tint(.white)
                        } else {
                            Text("Submit Rating")
                                .font(.headline)
                        }
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(rating > 0 ? Color.clientPrimary : Color.gray)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(rating == 0 || isSubmitting)
                .padding(.horizontal)
                .padding(.bottom)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Thank You!", isPresented: $showThankYou) {
                Button("Done") { dismiss() }
            } message: {
                Text("Your feedback helps us maintain quality service.")
            }
        }
    }

    private var ratingLabel: String {
        switch rating {
        case 1: return "Poor"
        case 2: return "Below Average"
        case 3: return "Average"
        case 4: return "Good"
        case 5: return "Excellent"
        default: return ""
        }
    }

    private func submitRating() {
        isSubmitting = true
        Task {
            struct RateBody: Codable {
                let rating: Int
                let comment: String?
            }
            let body = RateBody(rating: rating, comment: comment.isEmpty ? nil : comment)
            let _: ServiceRequest? = try? await APIClient.shared.post("/api/service-requests/\(serviceRequestId)/rate", body: body)
            showThankYou = true
            isSubmitting = false
        }
    }
}
