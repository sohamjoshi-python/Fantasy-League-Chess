import * as React from 'react';

const Privacy: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
    <div className="max-w-xl w-full bg-white rounded-lg shadow-lg p-8 border-2 border-royalBlue">
      <h1 className="text-2xl font-bold mb-4 text-neutral-900">Privacy Policy</h1>
      <p className="text-neutral-700 mb-4 text-sm">
        We respect your privacy. Your email and data are only used for account management and gameplay. We do not sell or share your information with third parties. For questions, contact the developer.
      </p>
      <a href="/" className="text-royalBlue underline">Back to Home</a>
    </div>
  </div>
);

export default Privacy; 