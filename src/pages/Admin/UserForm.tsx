import { useState, useEffect } from 'react';
import { UserPublic, UserCreate, UserUpdate } from '../../lib/api/models';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Button from '../../components/ui/button/Button';
import Checkbox from '../../components/form/input/Checkbox';

interface UserFormProps {
  user?: UserPublic | null;
  onSave: (data: UserCreate | UserUpdate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function UserForm({ user, onSave, onCancel, isLoading = false }: UserFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email);
      setIsActive(user.isActive || true);
      setIsSuperuser(user.isSuperuser || false);
    } else {
      setFullName('');
      setEmail('');
      setPassword('');
      setIsActive(true);
      setIsSuperuser(false);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const commonData = { email, fullName, isActive, isSuperuser };
    if (user) {
      onSave({ ...commonData });
    } else {
      onSave({ ...commonData, password });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Full Name</Label>
        <Input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {!user && (
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      )}
      <div className="flex items-center gap-4">
          <Checkbox checked={isActive} onChange={setIsActive} />
          <Label>Is Active</Label>
      </div>
      <div className="flex items-center gap-4">
          <Checkbox checked={isSuperuser} onChange={setIsSuperuser} />
          <Label>Is Superuser</Label>
      </div>
      <div className="flex justify-end gap-4 pt-4">
        <Button type="button" onClick={onCancel} variant="outline">Cancel</Button>
        <Button type="submit" isLoading={isLoading}>Save</Button>
      </div>
    </form>
  );
}
