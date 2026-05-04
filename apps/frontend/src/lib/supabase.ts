import { createClient } from "@/utils/supabase/client";
import { clearUserCookies } from "@/utils/useUser";

export const signupWithEmail = async (
  email: string,
  password: string,
  nickname?: string,
  role?: string
) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: nickname,
        role: role,
      },
    },
  });
  return { data, error };
};

export const signinWithEmail = async (email: string, password: string) => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  clearUserCookies();
  return { error };
};
