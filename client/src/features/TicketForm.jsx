import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Button, Input, Modal, Notice, Select, Textarea } from '../components/ui.jsx';
import { PRIORITY_OPTIONS, errorMessage, fieldErrors, idOf } from '../utils/format.js';

/** Create (ticket omitted) or edit (ticket provided) a ticket. */
export default function TicketFormModal({ open, onClose, ticket, onSaved }) {
  const editing = Boolean(ticket);
  const [formError, setFormError] = useState('');
  const org = useFetch(() => api.get('/org').then((r) => r.data), [open]);
  const members = useFetch(() => api.get('/org/members').then((r) => r.data), [open]);
  const categories = org.data?.organization.settings.categories || ['General'];
  const agents = (members.data || []).filter((m) => ['agent', 'admin', 'owner'].includes(m.role));

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    values: {
      subject: ticket?.subject || '', description: ticket?.description || '',
      customerName: ticket?.customerName || '', customerEmail: ticket?.customerEmail || '',
      priority: ticket?.priority || 'medium', category: ticket?.category || categories[0], assignee: idOf(ticket?.assignee) || '',
    },
  });

  const submit = async (v) => {
    setFormError('');
    const body = { ...v, assignee: v.assignee || null };
    try {
      const { data } = editing ? await api.patch(`/tickets/${ticket.id}`, body) : await api.post('/tickets', body);
      onSaved(data);
      onClose();
    } catch (e) {
      const d = fieldErrors(e);
      let shown = false;
      for (const k of Object.keys(body)) if (d[k]) { setError(k, { message: d[k] }); shown = true; }
      if (!shown) setFormError(errorMessage(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ticket #${ticket.number}` : 'New ticket'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={isSubmitting} onClick={handleSubmit(submit)}>{editing ? 'Save changes' : 'Create ticket'}</Button></>}>
      <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2" noValidate>
        {formError && <div className="sm:col-span-2"><Notice tone="error">{formError}</Notice></div>}
        <Input className="sm:col-span-2" label="Subject" error={errors.subject?.message} {...register('subject', { required: 'Enter a subject', minLength: { value: 3, message: 'At least 3 characters' } })} />
        <Input label="Customer name" error={errors.customerName?.message} {...register('customerName', { required: 'Enter the customer’s name' })} />
        <Input label="Customer email" type="email" error={errors.customerEmail?.message} {...register('customerEmail', { required: 'Enter the customer’s email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        <Textarea className="sm:col-span-2" label="Description" rows={5} error={errors.description?.message} {...register('description', { required: 'Describe the issue' })} />
        <Select label="Priority" {...register('priority')}>{PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
        <Select label="Category" {...register('category')}>{categories.map((c) => <option key={c}>{c}</option>)}{ticket && !categories.includes(ticket.category) && <option>{ticket.category}</option>}</Select>
        <Select className="sm:col-span-2" label="Assignee" {...register('assignee')}>
          <option value="">Unassigned</option>
          {agents.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
        </Select>
      </form>
    </Modal>
  );
}
