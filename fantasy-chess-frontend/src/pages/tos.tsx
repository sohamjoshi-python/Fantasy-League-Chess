import * as React from 'react';

const Tos: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
    <div className="max-w-xl w-full bg-white rounded-lg shadow-lg p-8 border-2 border-royalBlue">
      <h1 className="text-2xl font-bold mb-4 text-neutral-900">Terms of Service</h1>
      <p className="text-neutral-700 mb-4 text-sm">
        By using Pawn Royale, you agree to abide by our rules and policies. This app is for entertainment purposes only. No real money is involved. We reserve the right to suspend accounts for abuse or cheating. For questions, contact the developer.
      </p>
      <a href="/" className="text-royalBlue underline">Back to Home</a>
    </div>
  </div>
);

export default Tos; 