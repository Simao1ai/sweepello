import SwiftUI

struct LandingView: View {
    @State private var showLogin = false
    @State private var showApply = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero Section
                    heroSection

                    // Features Section
                    featuresSection

                    // How It Works Section
                    howItWorksSection

                    // CTA Section
                    ctaSection
                }
            }
            .ignoresSafeArea(edges: .top)
            .sheet(isPresented: $showLogin) {
                LoginView()
            }
            .sheet(isPresented: $showApply) {
                ContractorApplyView()
            }
        }
    }

    // MARK: - Hero

    private var heroSection: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.08, green: 0.08, blue: 0.12), Color(red: 0.1, green: 0.12, blue: 0.16)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 420)
            .overlay(alignment: .bottom) {
                LinearGradient(
                    colors: [Color.sweepelloPrimary, Color.sweepelloSecondary, Color.sweepelloAccent],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(height: 3)
            }

            VStack(spacing: 20) {
                Spacer()

                Image(systemName: "sparkles")
                    .font(.system(size: 56))
                    .foregroundStyle(.white)

                Text("Sweepello")
                    .font(.system(size: 42, weight: .bold))
                    .foregroundStyle(.white)

                Text("Professional Airbnb turnover\ncleaning, nationwide")
                    .font(.title3)
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center)

                HStack(spacing: 16) {
                    Button {
                        showLogin = true
                    } label: {
                        Text("Book a Clean")
                            .font(.headline)
                            .foregroundStyle(Color.sweepelloPrimary)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        showApply = true
                    } label: {
                        Text("Become a Cleaner")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(.white.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(.white.opacity(0.4), lineWidth: 1)
                            )
                    }
                }

                Spacer()
            }
            .padding()
        }
    }

    // MARK: - Features

    private var featuresSection: some View {
        VStack(spacing: 24) {
            Text("Why Sweepello?")
                .font(.title2.bold())
                .padding(.top, 40)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 20) {
                FeatureCard(icon: "clock.badge.checkmark", title: "Fast Matching", description: "Get matched with top-rated cleaners in minutes")
                FeatureCard(icon: "star.fill", title: "Vetted Pros", description: "Background-checked, insured professionals")
                FeatureCard(icon: "dollarsign.circle", title: "Fair Pricing", description: "Transparent pricing with no hidden fees")
                FeatureCard(icon: "location.fill", title: "Nationwide", description: "Available in cities across the US")
            }
            .padding(.horizontal)
        }
        .padding(.bottom, 40)
    }

    // MARK: - How It Works

    private var howItWorksSection: some View {
        VStack(spacing: 24) {
            Text("How It Works")
                .font(.title2.bold())

            VStack(spacing: 16) {
                StepRow(number: 1, title: "Request", description: "Enter your property details and pick a date")
                StepRow(number: 2, title: "Match", description: "We match you with the best available cleaner")
                StepRow(number: 3, title: "Clean", description: "Your cleaner arrives and gets to work")
                StepRow(number: 4, title: "Rate", description: "Rate your experience and rebook anytime")
            }
            .padding(.horizontal)
        }
        .padding(.vertical, 40)
        .background(Color(.systemGroupedBackground))
    }

    // MARK: - CTA

    private var ctaSection: some View {
        VStack(spacing: 16) {
            Text("Ready to get started?")
                .font(.title2.bold())
            Button {
                showLogin = true
            } label: {
                Text("Sign In / Create Account")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color.sweepelloPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 40)
        }
        .padding(.vertical, 40)
    }
}

// MARK: - Supporting Views

struct FeatureCard: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title)
                .foregroundStyle(Color.sweepelloPrimary)
            Text(title)
                .font(.headline)
            Text(description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}

struct StepRow: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 16) {
            Text("\(number)")
                .font(.title2.bold())
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(Color.sweepelloPrimary)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
