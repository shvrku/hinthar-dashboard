import { GraduationCap, Users, CalendarCheck, CreditCard, QrCode, ClipboardList } from "lucide-react"
import { AuthButtons } from "@/components/auth-buttons"

const features = [
  {
    title: "Class Management",
    description: "Organize classes, sections, and academic groups with ease.",
    icon: GraduationCap,
  },
  {
    title: "Student Records",
    description: "Maintain comprehensive student profiles and enrollment history.",
    icon: Users,
  },
  {
    title: "Session Scheduling",
    description: "Plan and manage class sessions with an intuitive timetable.",
    icon: CalendarCheck,
  },
  {
    title: "QR Check-In",
    description: "Fast attendance tracking via QR code scanning and manual entry.",
    icon: QrCode,
  },
  {
    title: "Payroll Management",
    description: "Handle staff pay periods, adjustments, and payroll items.",
    icon: CreditCard,
  },
  {
    title: "Audit Logging",
    description: "Keep a detailed record of all system activities and changes.",
    icon: ClipboardList,
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto flex flex-col items-center px-4 pb-24 pt-16 text-center md:pb-32 md:pt-24">
          <div className="mb-4 inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium">
            Built with Next.js &middot; Powered by Clerk
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            School Management,{" "}
            <span className="text-muted-foreground">Simplified</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A modern platform for managing classes, tracking attendance, scheduling
            sessions, and handling payroll — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <AuthButtons />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tools to streamline your school&apos;s daily operations.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-lg border p-6 transition-colors hover:bg-muted/50"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg border bg-background">
                  <feature.icon className="size-5 text-foreground" />
                </div>
                <h3 className="mb-1 font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Hinthar Dashboard &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
