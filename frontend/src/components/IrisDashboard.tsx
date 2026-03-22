
import { Section } from '@/components/ui/Section';
import { PatientRecordCard } from '@/components/PatientRecordCard';
import Header from '@/components/ui/Header';

export function IrisDashboard() {
  return (
    <main className="flex min-h-0 flex-col overflow-y-auto px-10 py-10 ">
          <Header title="Welcome to IRIS Health" description="Search and Understand Patient Records Instantly" />
          <Section
            title="Patient Records"
            subtitle="High level Overview of Your Patients"
            className="flex min-h-0 flex-1 flex-col ">
            <div className="flex-1 overflow-y-auto">
              <PatientRecordCard />
              <PatientRecordCard />
            </div>
          </Section>
    </main>
  );
}
