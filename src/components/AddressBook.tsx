import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Copy, MapPin } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  postcode: string;
  address: string;
  phone: string;
}

const STORAGE_KEY = 'loca8tor-address-book';

function loadContacts(): Contact[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveContacts(items: Contact[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function AddressBook() {
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [postcode, setPostcode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => { saveContacts(contacts); }, [contacts]);

  const addContact = () => {
    if (!name.trim() || !postcode.trim()) return;
    setContacts(prev => [{
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      postcode: postcode.trim().toUpperCase(),
      address: address.trim(),
      phone: phone.trim(),
    }, ...prev]);
    setName(''); setPostcode(''); setAddress(''); setPhone('');
    setShowForm(false);
  };

  const copyPostcode = async (pc: string) => {
    await navigator.clipboard.writeText(pc);
    setCopied(pc);
    setTimeout(() => setCopied(''), 1500);
  };

  const filtered = search
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.postcode.toLowerCase().includes(search.toLowerCase()) ||
        c.address.toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  return (
    <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="text-sm font-heading font-bold text-foreground">Address Book</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {showForm && (
        <div className="space-y-2 bg-secondary/40 rounded-lg p-3 animate-fade-up">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Customer name" className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
          <input type="text" value={postcode} onChange={e => setPostcode(e.target.value.toUpperCase())}
            placeholder="Postcode" className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Address (optional)" className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Phone (optional)" className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={addContact} disabled={!name.trim() || !postcode.trim()}
            className="w-full bg-primary text-primary-foreground text-xs font-heading font-semibold py-2 rounded-md hover:bg-primary/90 transition-all disabled:opacity-50">
            Save Contact
          </button>
        </div>
      )}

      {contacts.length > 3 && (
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts…"
          className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring" />
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          {contacts.length === 0 ? 'No contacts saved. Tap + to add.' : 'No matches found.'}
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
          {filtered.map(c => (
            <div key={c.id} className="flex items-center gap-2 bg-secondary/40 rounded-lg p-2.5 group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground font-mono">{c.postcode}</span>
                </div>
                {c.address && <p className="text-[10px] text-muted-foreground truncate">{c.address}</p>}
                {c.phone && <p className="text-[10px] text-muted-foreground">📞 {c.phone}</p>}
              </div>
              <button onClick={() => copyPostcode(c.postcode)}
                className="p-1.5 rounded hover:bg-secondary transition-colors shrink-0" title="Copy postcode">
                <Copy className={`w-3 h-3 ${copied === c.postcode ? 'text-green-500' : 'text-muted-foreground'}`} />
              </button>
              <button onClick={() => setContacts(prev => prev.filter(x => x.id !== c.id))}
                className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-all shrink-0">
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
