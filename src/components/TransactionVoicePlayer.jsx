export default function TransactionVoicePlayer({ voiceNote }) {
  if (!voiceNote) {
    return null;
  }

  return (
    <div style={{ marginTop: "10px" }}>
      <p style={{ marginBottom: "6px", fontWeight: "600" }}>Voice Note</p>
      <audio key={voiceNote} controls style={{ width: "100%" }}>
        <source src={voiceNote} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}