// SignUpPage is now handled inside SignInPage tabs — redirect to signin
import { Navigate } from 'react-router-dom'
export function SignUpPage() { return <Navigate to="/signin" replace /> }
