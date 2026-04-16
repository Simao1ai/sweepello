import SwiftUI

struct AdminPaymentsView: View {
    @State private var payments: [Payment] = []
    @State private var isLoading = true
    @State private var selectedFilter: PaymentFilter = .all

    enum PaymentFilter: String, CaseIterable {
        case all = "All"
        case incoming = "Incoming"
        case outgoing = "Outgoing"
    }

    var filteredPayments: [Payment] {
        switch selectedFilter {
        case .all: return payments
        case .incoming: return payments.filter { $0.type == "incoming" }
        case .outgoing: return payments.filter { $0.type == "outgoing" }
        }
    }

    var totalIncoming: Double {
        payments.filter { $0.type == "incoming" }.reduce(0) { $0 + $1.amountValue }
    }

    var totalOutgoing: Double {
        payments.filter { $0.type == "outgoing" }.reduce(0) { $0 + $1.amountValue }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Summary
            HStack(spacing: 16) {
                PaymentSummaryCard(title: "Incoming", amount: totalIncoming, color: .green)
                PaymentSummaryCard(title: "Outgoing", amount: totalOutgoing, color: .red)
                PaymentSummaryCard(title: "Net", amount: totalIncoming - totalOutgoing, color: .blue)
            }
            .padding()

            Picker("Filter", selection: $selectedFilter) {
                ForEach(PaymentFilter.allCases, id: \.self) { f in
                    Text(f.rawValue).tag(f)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)

            if isLoading {
                Spacer()
                ProgressView()
                Spacer()
            } else {
                List(filteredPayments) { payment in
                    PaymentRow(payment: payment)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Payments")
        .refreshable { await loadPayments() }
        .task { await loadPayments() }
    }

    private func loadPayments() async {
        isLoading = true
        payments = (try? await APIClient.shared.get("/api/payments")) ?? []
        isLoading = false
    }
}

struct PaymentSummaryCard: View {
    let title: String
    let amount: Double
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text("$\(String(format: "%.0f", amount))")
                .font(.headline)
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct PaymentRow: View {
    let payment: Payment

    var body: some View {
        HStack {
            Image(systemName: payment.isIncoming ? "arrow.down.circle.fill" : "arrow.up.circle.fill")
                .foregroundStyle(payment.isIncoming ? .green : .red)
                .font(.title3)

            VStack(alignment: .leading, spacing: 2) {
                Text(payment.isIncoming ? "Client Payment" : "Cleaner Payout")
                    .font(.subheadline.bold())
                StatusBadge(status: payment.status.capitalized, color: payment.status == "completed" ? .green : .orange)
            }
            Spacer()
            Text("$\(payment.amount)")
                .font(.subheadline.bold())
                .foregroundStyle(payment.isIncoming ? .green : .red)
        }
        .padding(.vertical, 4)
    }
}
