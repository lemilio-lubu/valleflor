import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/login`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            },
          );
          if (!res.ok) return null;
          const data = await res.json();
          // API returns { accessToken, user: { id, email, role, fincaId, fincaNombre } }
          return {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            fincaId: data.user.fincaId,
            fincaNombre: data.user.fincaNombre,
            responsableNombre: data.user.responsableNombre,
            accessToken: data.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.fincaId = (user as any).fincaId;
        token.fincaNombre = (user as any).fincaNombre;
        token.responsableNombre = (user as any).responsableNombre;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).fincaId = token.fincaId;
      (session.user as any).fincaNombre = token.fincaNombre;
      (session.user as any).responsableNombre = token.responsableNombre;
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'floricultura-secret-change-in-prod',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
