-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('teacher', 'student');
CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'paused', 'submitted');
CREATE TYPE public.strictness_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.code_language AS ENUM ('c', 'java', 'python');

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  college_uid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- USER ROLES (separate table to avoid privilege escalation)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- TESTS
-- =========================================================
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  branch TEXT,
  section TEXT,
  exam_date DATE,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  strictness public.strictness_level NOT NULL DEFAULT 'medium',
  language public.code_language NOT NULL DEFAULT 'python',
  code_weight NUMERIC NOT NULL DEFAULT 0.7,
  viva_weight NUMERIC NOT NULL DEFAULT 0.3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tests_teacher ON public.tests(teacher_id);
CREATE INDEX idx_tests_code ON public.tests(test_code);

-- =========================================================
-- TEST QUESTIONS
-- =========================================================
CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  starter_code TEXT DEFAULT '',
  sample_input TEXT DEFAULT '',
  expected_output TEXT DEFAULT '',
  hidden_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_score INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_questions_test ON public.test_questions(test_id);

-- =========================================================
-- TEST ATTEMPTS
-- =========================================================
CREATE TABLE public.test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_full_name TEXT NOT NULL,
  student_college_uid TEXT NOT NULL,
  status public.attempt_status NOT NULL DEFAULT 'in_progress',
  pause_code TEXT,
  violation_count INTEGER NOT NULL DEFAULT 0,
  code_score NUMERIC DEFAULT 0,
  viva_score NUMERIC DEFAULT 0,
  final_score NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (test_id, student_id)
);
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attempts_test ON public.test_attempts(test_id);
CREATE INDEX idx_attempts_student ON public.test_attempts(student_id);

-- =========================================================
-- CODE SUBMISSIONS
-- =========================================================
CREATE TABLE public.code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.test_questions(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  language public.code_language NOT NULL,
  last_output TEXT,
  last_stderr TEXT,
  ai_score NUMERIC DEFAULT 0,
  ai_feedback TEXT,
  time_to_solve_seconds INTEGER,
  paste_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_submissions_attempt ON public.code_submissions(attempt_id);

-- =========================================================
-- VIVA RESPONSES
-- =========================================================
CREATE TABLE public.viva_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.code_submissions(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  student_answer TEXT DEFAULT '',
  ai_score NUMERIC DEFAULT 0,
  ai_feedback TEXT,
  flagged_injection BOOLEAN DEFAULT false,
  needs_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.viva_responses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_viva_submission ON public.viva_responses(submission_id);

-- =========================================================
-- PROCTOR VIOLATIONS
-- =========================================================
CREATE TABLE public.proctor_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL,
  resume_code TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.proctor_violations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_violations_attempt ON public.proctor_violations(attempt_id);

-- =========================================================
-- TRIGGERS: updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tests_updated BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_attempts_updated BEFORE UPDATE ON public.test_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON public.code_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_viva_updated BEFORE UPDATE ON public.viva_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- TRIGGER: auto-create profile + default student role on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, college_uid)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'college_uid', NULL)
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Teachers view student profiles in their tests" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1 FROM public.test_attempts ta
      JOIN public.tests t ON t.id = ta.test_id
      WHERE ta.student_id = profiles.user_id AND t.teacher_id = auth.uid()
    )
  );
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- user_roles (read-only for owner, no client writes)
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- tests
CREATE POLICY "Teachers manage own tests" ON public.tests
  FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Students view tests they attempt" ON public.tests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts ta
      WHERE ta.test_id = tests.id AND ta.student_id = auth.uid()
    )
  );

-- test_questions
CREATE POLICY "Teachers manage questions of own tests" ON public.test_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_questions.test_id AND t.teacher_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_questions.test_id AND t.teacher_id = auth.uid())
  );
CREATE POLICY "Students view questions of attempted tests" ON public.test_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts ta
      WHERE ta.test_id = test_questions.test_id AND ta.student_id = auth.uid()
    )
  );

-- test_attempts
CREATE POLICY "Students manage own attempts" ON public.test_attempts
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers view attempts of own tests" ON public.test_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_attempts.test_id AND t.teacher_id = auth.uid())
  );
CREATE POLICY "Teachers update attempts of own tests" ON public.test_attempts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tests t WHERE t.id = test_attempts.test_id AND t.teacher_id = auth.uid())
  );

-- code_submissions
CREATE POLICY "Students manage own submissions" ON public.code_submissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.test_attempts ta WHERE ta.id = code_submissions.attempt_id AND ta.student_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.test_attempts ta WHERE ta.id = code_submissions.attempt_id AND ta.student_id = auth.uid())
  );
CREATE POLICY "Teachers view submissions of own tests" ON public.code_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts ta
      JOIN public.tests t ON t.id = ta.test_id
      WHERE ta.id = code_submissions.attempt_id AND t.teacher_id = auth.uid()
    )
  );

-- viva_responses
CREATE POLICY "Students manage own viva" ON public.viva_responses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.code_submissions cs
      JOIN public.test_attempts ta ON ta.id = cs.attempt_id
      WHERE cs.id = viva_responses.submission_id AND ta.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.code_submissions cs
      JOIN public.test_attempts ta ON ta.id = cs.attempt_id
      WHERE cs.id = viva_responses.submission_id AND ta.student_id = auth.uid()
    )
  );
CREATE POLICY "Teachers view viva of own tests" ON public.viva_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.code_submissions cs
      JOIN public.test_attempts ta ON ta.id = cs.attempt_id
      JOIN public.tests t ON t.id = ta.test_id
      WHERE cs.id = viva_responses.submission_id AND t.teacher_id = auth.uid()
    )
  );

-- proctor_violations
CREATE POLICY "Students manage own violations" ON public.proctor_violations
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.test_attempts ta WHERE ta.id = proctor_violations.attempt_id AND ta.student_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.test_attempts ta WHERE ta.id = proctor_violations.attempt_id AND ta.student_id = auth.uid())
  );
CREATE POLICY "Teachers view & resolve violations of own tests" ON public.proctor_violations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts ta
      JOIN public.tests t ON t.id = ta.test_id
      WHERE ta.id = proctor_violations.attempt_id AND t.teacher_id = auth.uid()
    )
  );