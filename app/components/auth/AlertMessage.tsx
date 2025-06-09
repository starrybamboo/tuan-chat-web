interface AlertMessageProps {
  errorMessage: string;
  successMessage: string;
}

export function AlertMessage({ errorMessage, successMessage }: AlertMessageProps) {
  return (
    <div className="toast toast-top toast-center">
      {errorMessage && (
        <div className="alert alert-error">
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success">
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
