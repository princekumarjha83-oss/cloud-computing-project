import React from 'react';

export default function AppSimple() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a1a',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#3b82f6', fontSize: '2rem' }}>GuardianEye</h1>
      <h2 style={{ color: '#10b981', fontSize: '1.5rem' }}>Cloud Computing Crime Reporting</h2>
      <p style={{ fontSize: '1.2rem', margin: '20px 0' }}>
        Application is working! This is a test version to verify deployment.
      </p>
      <div style={{ 
        backgroundColor: '#374151', 
        padding: '15px', 
        borderRadius: '8px',
        margin: '10px 0'
      }}>
        <h3>Features Available:</h3>
        <ul>
          <li>Crime Reporting Dashboard</li>
          <li>Interactive Crime Map</li>
          <li>Evidence Vault</li>
          <li>AI Chatbot Assistant</li>
          <li>Admin Panel</li>
        </ul>
      </div>
      <button style={{
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '10px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1rem'
      }}>
        Test Button - Click Me!
      </button>
    </div>
  );
}
