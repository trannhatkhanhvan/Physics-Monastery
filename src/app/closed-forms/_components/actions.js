'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  makeSession,
  validPassword
} from '@/lib/wolfram-private';

export async function logIn(form) {
  const supplied = form.get('password');

  if (!validPassword(supplied)) {
    redirect('/closed-forms?invalid=1');
  }

  (await cookies()).set(SESSION_COOKIE, makeSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 86400,
  });

  redirect('/closed-forms');
}

export async function logOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/closed-forms');
}
