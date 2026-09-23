// Supabase connection for the survey.
// The publishable key is safe to expose in the browser: database Row Level Security
// allows anonymous visitors to INSERT responses only. Reading and deleting
// responses requires signing in with an email listed in grass_survey_admins.
window.SURVEY_CONFIG = {
  supabaseUrl: "https://vqbisxhuiseabvnqrfrf.supabase.co",
  supabaseKey: "sb_publishable_sNQIdaKuXI-E84ic9Tp4gw_PMIMrYMC",
  table: "grass_survey_responses"
};
