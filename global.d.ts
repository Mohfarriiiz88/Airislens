type MidtransSnapCallbacks = {
  onSuccess?: () => void;
  onPending?: () => void;
  onError?: () => void;
  onClose?: () => void;
};

type MidtransSnap = {
  pay: (token: string, callbacks?: MidtransSnapCallbacks) => void;
};

interface Window {
  snap: MidtransSnap;
}
