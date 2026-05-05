import { useState, type FormEvent } from "react";
import { Button } from "../../components/Button";
import { Modal } from "../../components/Modal";
import { Table } from "../../components/Table";
import { useFetch } from "../../hooks/useFetch";
import { createFeature, type Feature } from "../../services/feature.service";
import { formatDate } from "../../utils/formatDate";

const INITIAL_FORM = {
  description: "",
  name: "",
  status: "draft"
};

export function FeatureA() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data, error, loading, refetch } = useFetch<Feature[]>("/api/feature");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await createFeature(form);
      setForm(INITIAL_FORM);
      setModalOpen(false);
      refetch();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Resource list</p>
            <h1>Feature A</h1>
            <p className="section-copy">This section is wired to the FastAPI feature endpoints and can create new records.</p>
          </div>
          <Button onClick={() => setModalOpen(true)}>Add feature</Button>
        </div>
        {loading && <p>Loading features...</p>}
        {error && <p className="error-text">{error}</p>}
        <Table
          columns={[
            { key: "name", label: "Name" },
            { key: "status", label: "Status", render: (row) => <span className="status-pill">{String(row.status)}</span> },
            { key: "description", label: "Description" },
            { key: "created_at", label: "Created", render: (row) => formatDate(String(row.created_at)) }
          ]}
          getRowKey={(row) => row.id}
          rows={data ?? []}
        />
      </section>

      <Modal onClose={() => setModalOpen(false)} open={modalOpen} title="Create feature">
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="draft">draft</option>
              <option value="ready">ready</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <Button disabled={submitting} type="submit">
            {submitting ? "Saving..." : "Save feature"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
