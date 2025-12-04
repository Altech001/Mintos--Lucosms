import { useState, useEffect } from 'react';
import { PromoCodePublic, PromoCodeCreate, PromoCodeUpdate } from '@/lib/api/models';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Button from '../../components/ui/button/Button';
import Checkbox from '../../components/form/input/Checkbox';

interface PromoCodeFormProps {
  promoCode?: PromoCodePublic | null;
  onSave: (data: PromoCodeCreate | PromoCodeUpdate) => void;
  onCancel: () => void;
}

export default function PromoCodeForm({ promoCode, onSave, onCancel }: PromoCodeFormProps) {
  const [code, setCode] = useState('');
  const [smsCost, setSmsCost] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [description, setDescription] = useState<string | null>(null);

  useEffect(() => {
    if (promoCode) {
      setCode(promoCode.code);
      setSmsCost(parseFloat(promoCode.smsCost));
      setExpiresAt(promoCode.expiresAt ? new Date(promoCode.expiresAt).toISOString().split('T')[0] : '');
      setIsActive(promoCode.isActive || true);
      setMaxUses(promoCode.maxUses);
      setDescription(promoCode.description);
    } else {
      setCode('');
      setSmsCost(0);
      setExpiresAt('');
      setIsActive(true);
      setMaxUses(null);
      setDescription(null);
    }
  }, [promoCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      code,
      smsCost: String(smsCost),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive,
      maxUses: maxUses,
      description: description,
    };
    onSave(data as PromoCodeCreate | PromoCodeUpdate);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Promo Code</Label>
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>SMS Cost</Label>
        <Input
          type="number"
          step="0.0001"
          value={smsCost}
          onChange={(e) => setSmsCost(parseFloat(e.target.value))}
          required
        />
      </div>
      <div>
        <Label>Expires At (Optional)</Label>
        <Input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>
      <div>
        <Label>Max Uses (Optional)</Label>
        <Input
          type="number"
          value={maxUses || ''}
          onChange={(e) => setMaxUses(e.target.value ? parseInt(e.target.value) : null)}
        />
      </div>
      <div>
        <Label>Description (Optional)</Label>
        <Input
          type="text"
          value={description || ''}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-4">
        <Checkbox checked={isActive} onChange={setIsActive} />
        <Label>Is Active</Label>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
