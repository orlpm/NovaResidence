function Register() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-center mb-6">Crear Cuenta</h2>
      <p className="text-center text-gray-600 mb-8">
        Únete a NovaResidence
      </p>
      {/* Registration form will go here */}
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}

export default Register
