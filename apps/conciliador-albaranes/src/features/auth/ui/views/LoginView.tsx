import { LoginForm } from '../components/LoginForm';

export function LoginView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          Conciliador de Albaranes
        </h1>
        <p className="mb-6 text-sm text-gray-500">Inicia sesión para continuar.</p>
        <LoginForm />
      </div>
    </div>
  );
}
