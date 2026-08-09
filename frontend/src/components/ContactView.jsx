import { useAppContext } from "../context/AppContext";
import { Button, Card, Field, PageHeader, inputCls } from "./ui";

export default function ContactView() {
  const {
    contactDept,
    contactEmail,
    contactMsg,
    contactName,
    contactSuccess,
    setContactDept,
    setContactEmail,
    setContactMsg,
    setContactName,
    setContactSuccess,
  } = useAppContext();

  return (
    <div className="space-y-6">
      <PageHeader title="Contact us" subtitle="Submit feedback, report an issue, or reach the team." />
      <Card className="max-w-2xl p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setContactSuccess(`Message received at ${new Date().toLocaleString()}`);
            setContactName("");
            setContactEmail("");
            setContactMsg("");
          }}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Your name" required>
              <input className={inputCls} type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. John Doe" />
            </Field>
            <Field label="Email" required>
              <input className={inputCls} type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
          </div>
          <Field label="Topic">
            <select className={inputCls} value={contactDept} onChange={(e) => setContactDept(e.target.value)}>
              <option>Product feedback</option>
              <option>Bug report</option>
              <option>Feature request</option>
            </select>
          </Field>
          <Field label="Message" required>
            <textarea className={inputCls} rows={5} required value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} placeholder="Tell us what's on your mind..." />
          </Field>
          {contactSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              {contactSuccess}
            </div>
          )}
          <Button type="submit">
            <span className="material-symbols-outlined text-base">send</span>
            Send message
          </Button>
        </form>
      </Card>
    </div>
  );
}
