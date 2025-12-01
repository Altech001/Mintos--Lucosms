
import Button from "../button/Button";
import Modal from "./Modal";

interface AlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
}

export default function AlertDialog({ isOpen, onClose, title, message, type = 'info' }: AlertDialogProps) {
    const isError = type === 'error';
    const isSuccess = type === 'success';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    <Button
                        onClick={onClose}
                        variant={isError ? 'danger' : 'primary'}
                        className="w-full sm:w-auto"
                    >
                        {isSuccess ? 'Okay' : 'Close'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
