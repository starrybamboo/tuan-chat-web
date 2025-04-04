interface AlertMessageProps {
  errorMessage: string;
  successMessage: string;
}

export function AlertMessage({ errorMessage, successMessage }: AlertMessageProps) {
  return (
    <>
      {errorMessage && (
        <div className="alert alert-error mb-4">
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success mb-4">
          <span>{successMessage}</span>
        </div>
      )}
    </>
  );
}
