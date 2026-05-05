import { PulseLoader } from 'react-spinners';

export default function Loader() {
  return (
    <div className="flex justify-center items-center p-4 min-h-screen">
      <PulseLoader color="#22c55e" size={12} />
    </div>
  );
}
