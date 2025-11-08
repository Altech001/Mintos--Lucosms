import { useState } from 'react';
import { UserPublic } from '../../../lib/api/models';
import Input from '../../../components/form/input/InputField';
import Label from '../../../components/form/Label';
import Button from '../../../components/ui/button/Button';

interface FundsModalProps {
  user: UserPublic;
  onClose: () => void;
  onAddFunds: (amount: number, reason: string) => Promise<void>;
  onDeductFunds: (amount: number, reason: string) => Promise<void>;
  isMutating: boolean;
}

export default function FundsModal({ user, onClose, onAddFunds, onDeductFunds, isMutating }: FundsModalProps) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');

  const handleAdd = () => {
    onAddFunds(amount, reason);
  };

  const handleDeduct = () => {
    onDeductFunds(amount, reason);
  };

  return (
    <div className="space-y-4">
      <p>Managing funds for <strong>{user.fullName || user.email}</strong>.</p>
      <p>Current Balance: <strong>${parseFloat(user.wallet || '0').toFixed(2)}</strong></p>
      <div>
        <Label>Amount</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          placeholder="e.g., 5000"
        />
      </div>
      <div>
        <Label>Reason / Reference (Optional)</Label>
        <Input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Monthly bonus"
        />
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <Button onClick={onClose} variant="outline">Cancel</Button>
        <Button onClick={handleDeduct} variant="danger" isLoading={isMutating}>Deduct Funds</Button>
        <Button onClick={handleAdd} isLoading={isMutating}>Add Funds</Button>
      </div>
    </div>
  );
}
