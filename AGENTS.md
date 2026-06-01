# AGENTS.md - API Guide for the Android Client (`net.tornevall.android.tools`)

This guide describes the API surface in `tools.tornevall.com` for Android integration.
?Source: `tools.tornevall.com/routes/api.php` plus relevant controllers (status: 2026-04-06).

Current Android repo status (2026-04-22): the app now includes functional SocialGPT/mobile flows (token validation, settings sync subset, reply suggestions with modify, verify fact, accessibility capture, and styled bubble overlay) and uses direct `HttpURLConnection` clients. It still does not use Retrofit/OkHttp service layers.

## Local agent workflow policy (project-specific)

- **Commit + push after completed code/docs changes**: when a task is finished and verified, agents should create a commit and push it to the active remote branch.
- **No version tags unless explicitly requested**: agents must not create or push Git tags automatically. Tagging is only allowed when the user explicitly asks for it in that session.

## Change sync (2026-06-01)

- **Tools bearer-token auth is now scope-driven instead of provider-name-driven for `api_keys`-backed endpoints** – newer Tools builds still keep provider labels such as `provider_socialgpt`, `provider_tools_openai`, `provider_whisper_api`, and `provider_mail_support_assistant_mailer` for operator/UI organization, but runtime auth now checks the token's effective `access_scopes[]` first.
  - Scope guidance: `ai.client` covers SocialGPT / extension / Mail Support Assistant config-style bearer flows, `ai.internal` covers `POST /api/ai/internal/respond`, `whisper.api` covers the token-authenticated Whisper transcription API, `mail-support-assistant.relay` covers `POST /api/mail-support-assistant/send-reply`, and the older `is_ai=1` flag is still treated as a legacy compatibility path for `ai.client`.
  - Compatibility guidance: older dedicated provider rows still work because Tools backfills the same effective scopes from the legacy provider/is_ai data, but newer clients should no longer assume that a specific provider name is itself the auth contract.

## Change sync (2026-05-23)

- **DNS editor/provider routing can now auto-detect Cloudflare-backed zones from authoritative nameservers** – the `/api/dns/zones/{zone}`, `/api/dns/zones/{zone}/cache`, `/api/dns/zones/{zone}/axfr`, and `/api/dns/records/*` editor flows can now infer one Cloudflare-backed zone even before an explicit `dns_provider_zone_mappings` row was saved, as long as the authoritative NS set for that zone resolves entirely to `*.ns.cloudflare.com`.
  - Behavioral guidance: if Tools sees Cloudflare nameservers for the zone, the editor can now switch to the same Cloudflare-backed read/write path that was previously only used for explicitly mapped zones.
  - Compatibility guidance: explicit saved provider mappings still win. The nameserver-based inference is a fallback for zones that otherwise would have failed with an AXFR-style refresh error even though Cloudflare is authoritative.

## Change sync (2026-05-21)

## Change sync (2026-05-29)

- **DNSBL stats responses now carry additive presentation labels so clients can describe rejected requests more safely** – `GET /api/dnsbl/stats` keeps the same auth model and core counters, but newer responses can now also expose additive human-friendly metadata on the existing stats blocks.
  - Additive guidance for `stats.api_queries`: top-level query counters and each `by_endpoint` row can now also include additive `label`, additive `description`, additive `success_label`, additive `non_success_label`, and additive `non_success_explainer` so clients can present non-2xx/3xx counts as rejected/non-success requests instead of implying a hard backend outage.
  - Additive guidance for `stats.mutations`: action groups such as `additions`, `removals`, and `updates` can now also include additive `label`, additive `success_label`, additive `failed_label`, additive `failed_explainer`, additive `dry_run_label`, and for removals additive `already_not_listed_label`; `by_outcome.{outcome}` rows can now also carry additive `label` with the same friendlier wording.
  - Compatibility guidance: the numeric fields are unchanged (`failed_requests`, `failed_records`, etc.). Older clients can ignore the additive labels and still rely on the existing counters.

- **Firewall runtime route-config endpoints now expose generated `run-after` fragments for infrastructure hosts such as the gateway** – Tools now also has `GET /api/firewall/runtime/{host}` plus `GET /api/firewall/runtime/{host}/run-after.conf` alongside the existing child-control `/api/firewall/*` surface.
  - Auth guidance: these runtime endpoints are intended for internal server/runtime maintenance, not for the ordinary Android child-control UI. They accept either an authenticated web operator with `firewall` permission or a dedicated `X-Firewall-Config-Token` / bearer token configured on the server that refreshes its local generated fragment.
  - Response guidance for `GET /api/firewall/runtime/{host}`: success payloads can now include `host`, `display_name`, `generated_conf_target`, `refresh_interval_seconds`, and additive grouped `groups[]` metadata (`key`, `label`, `command_count`, `commands[]`) describing the central route bundles that Tools currently publishes for that host.
  - Shell guidance for `GET /api/firewall/runtime/{host}/run-after.conf`: the response is plain-text shell content meant to be written into one local `run-after.d/*.conf` file and sourced by the server-side `run-after.sh` helper, rather than JSON intended for Android rendering.

## Change sync (2026-05-19)

- **vBulletin invite-complete frontend handoff is now explicitly public/token-free and invite-code input is URL-tolerant** – `POST /api/vbulletin/onboarding/invite/complete` remains the same endpoint, but newer clients/frontend hooks should now treat it as a public invite-driven handoff instead of a bearer-token API.
  - Auth guidance: do not send a bearer token just to complete the invite. The endpoint is intended to trust the invite-code flow plus server-side forum-account validation.
  - Request guidance: `invite_code` may now be either the raw invite token or a full onboarding URL that contains the token (for example `/vbulletin/onboarding/{slug}/{inviteKey}`); Tools now strips that URL down to the real invite token before lookup.
  - Frontend guidance: forum hooks should still prefer sending the clean invite token when available, but can now survive users/profile fields that accidentally store the whole onboarding URL instead of only the code.

## Change sync (2026-05-14)

- **vBulletin onboarding now also exposes a registration-complete invite endpoint for future hosted forum scripts** – Tools now has `POST /api/vbulletin/onboarding/invite/complete` for the post-registration handoff where a future vBulletin frontend script can say that one forum registration appears completed and ask Tools to finish the invite safely.
  - Request guidance: `invite_code` is required; additive `forum_user_id`, `forum_username`, and `forum_email` are optional hints.
  - Behavioral guidance: `forum_email` is only a lookup hint, not proof. Tools now resolves the forum account from the invite plus the available identity hints, reuses an existing onboarding request when one already exists, or creates a new request when the invite is still valid and no earlier request exists yet.
  - Safety guidance: when the invite is tied to one specific forum user, the resolved account must match that user. When the onboarding flow uses an invite-code profile field, the resolved forum account must still contain that same invite code in the configured vBulletin profile field before the completion call succeeds.
  - Activation guidance: the endpoint only auto-approves and grants forum access when the existing onboarding config already allows safe automatic approval without manual review; otherwise the request stays linked/pending review.
  - Response guidance: success payloads can now include top-level `request`, `forum_user`, `created_request`, `linked_now`, `approved_now`, `already_completed`, `requires_manual_review`, `access_granted`, `dry_run_only`, `next_action`, and additive `validation.match_sources[]` / `validation.profile_field_match` metadata.

- **SocialGPT verify/fact-check model choice is now Tools-controlled instead of extension-controlled** – `POST /api/ai/socialgpt/respond` keeps the same endpoint shape, but newer browser/native clients should no longer assume that the local app/extension chooses the verification model for `request_mode="verify"`.
  - Behavioral guidance: when the request is a verify/fact-check run, Tools can ignore a client-supplied model hint and choose the verification model server-side instead.
  - Behavioral guidance: when web search is part of the verification path and `gpt-4o` is available, Tools may now prefer `gpt-4o` as the primary verification model.
- **SocialGPT participant-analysis requests now separate the fast first-pass person scan from the richer preview-follow-up comment scan** – `POST /api/ai/socialgpt/respond` keeps the same endpoint shape, but extension/browser clients can now send additive `extra_data.participant_analysis_phase="initial"` for the first visible-card-only user analysis, and later additive `extra_data.participant_analysis_phase="followup_preview"` (optionally together with additive `extra_data.socialgpt_latency_mode="fast_followup"` and additive `extra_data.facebook_preview_focus_name`) when more preview/original-post comment context appears.
  - Behavioral guidance: when the additive phase is the first-pass `initial` user analysis, Tools now skips the normal web-search requirement and uses a smaller default completion budget so the first answer returns faster and does not do deeper person-search style lookups unnecessarily.
  - Behavioral guidance: when the additive phase is `followup_preview`, Tools can again require web search if the richer comment/original-post context now contains fact-check/current-info/source-check signals worth verifying.
  - Additive browser-race guidance: newer browser clients can also send additive `extra_data.web_search_mode="force_off|force_on|auto"` to ask the backend to keep one request on a no-web-search path or explicitly allow web search for one parallel race variant; `auto` remains the default behavior.
  - Compatibility guidance: this is additive only; older clients can ignore the fields, but newer browser/native clients should treat the first pass and later preview follow-up as separate analysis phases.
- **SocialGPT participant-request history lookups now include earlier approvals as well as rejections** – `POST /api/social-media-tools/extension/facebook-participant-history` keeps the same token-authenticated extension-only request shape (`page_url`, `group_id`, `period_days`, `candidates[]`), but successful participant rows can now also include additive approval metadata instead of only rejection counters.
  - Additive response guidance: participant rows can now also expose additive `matched=true|false`, additive `decision_count`, additive `approved_count`, additive `approved_membership_request_count`, additive `approved_pending_post_count`, additive `approved_regular_pending_post_count`, additive `approved_anonymous_pending_post_count`, additive `approved_other_count`, additive `first_seen_at`, additive `last_seen_at`, additive `first_approved_at`, additive `last_approved_at`, and additive `latest_outcome` alongside the earlier rejection-focused fields.
  - Behavioral guidance: `summary_text` is now a combined moderation summary for matching linked logged groups, so extension/native clients should no longer assume it only describes earlier rejections.

## Change sync (2026-05-13)

- **SocialGPT extension settings now also expose additive per-Facebook-group participant-request rules** – `GET|PUT /api/social-media-tools/extension/settings` can now also carry additive `settings.facebook_participant_group_contexts_by_group_id`.
  - Response guidance: this is an additive map keyed by Facebook group id/path segment (the `<id>` from `/groups/<id>/...`), where each value is the saved operator moderation/risk text for that exact group.
  - Update guidance: clients can now send the same additive object field back on `PUT /api/social-media-tools/extension/settings` to save/replace the current per-group rules map alongside the older global `facebook_participant_group_context` fallback field.
  - Behavioral guidance: on actual Facebook participant-request pages the browser extension now prefers only the exact current group's entry from this map; the older single `facebook_participant_group_context` field should be treated as a global fallback/default rather than as one shared rules value for every group.
- **SocialGPT timeout/connection failures now surface friendlier API metadata instead of only raw transport text** – `POST /api/ai/socialgpt/respond` can now return additive client-facing error fields when Tools hits a temporary OpenAI timeout or connection problem.
  - Additive error-response guidance: failures can now also include `user_message`, additive `retryable=true|false`, additive `error_code` (for example `openai_timeout`), and additive `upstream` (`provider`, `endpoint`, `timeout`, `temporary`) alongside the existing `error`, `status`, `request_id`, `settings_source`, `backend`, `request_summary`, `verification`, and `client` fields.
  - Client guidance: native/extension clients should prefer `user_message` for operator-visible wording and keep the raw `error` mainly for debug/diagnostics.
  - Retry guidance: when `retryable=true`, clients can present the failure as temporary and offer a retry instead of treating it as a permanent configuration error.
- **SocialGPT verify/source-check flows can now keep the preliminary answer when only the final OpenAI refinement step times out** – `POST /api/ai/socialgpt/respond` success payloads can now include additive notice metadata even when the overall request still succeeded.
  - Additive success-response guidance: successful responses can now also include nullable `notice` when the visible answer is still the preliminary version because the last OpenAI refinement timed out.
  - Additive web-search guidance: `web_search` can now also expose `finalization_failed=true|false` and nullable `finalization_error` alongside the earlier `requested`, `required`, `used`, `failed`, `error`, and `citations[]` fields.
  - Client guidance: when `notice` is present or `web_search.finalization_failed=true`, clients should keep the returned `response` visible but present it as a softer/preliminary answer rather than as a fully finalized verified rewrite.

## Change sync (2026-05-12)

- **SocialGPT now has a dedicated token provider separated from direct OpenAI API access** – `POST /api/ai/socialgpt/respond` still uses Tools-hosted OpenAI internally, but the Chrome/native SocialGPT client token is now explicitly a SocialGPT/Social Media Tools token (`provider_socialgpt`, with legacy `tools_ai_bearer` still accepted for compatibility), not a grant of ordinary direct OpenAI API endpoint access.
  - Client guidance: Android/SocialGPT clients should treat the SocialGPT token as scoped to SocialGPT-style requests and should not present it as a general OpenAI API token.
  - Access guidance: direct OpenAI-backed endpoints such as URL analysis still require the separate OpenAI access-request approval flow. SocialGPT token creation/use does not by itself mean the account has general direct OpenAI API access.
  - Support workflow guidance: when users submit or update direct OpenAI access requests, Tools now notifies support by mail in addition to storing the pending request for admin review.

- **SocialGPT/OpenAI access requests now have a user-facing Social Media Tools entrypoint** – the web-side `/admin/social-media-tools` landing page is now available to every signed-in user so extension users can generate/rotate the personal SocialGPT token and, separately, submit a direct OpenAI API access request when they need broader OpenAI-backed endpoints outside SocialGPT.
  - Additive error guidance: when SocialGPT/OpenAI access is missing, newer `/api/ai/socialgpt/respond` errors can include `access.required=true` and `access.request_url` pointing to the Social Media Tools landing page in addition to the normal error text.
  - Client guidance: native/extension clients should send users to the Social Media Tools/OpenAI access request page when this access metadata is present instead of only showing a generic forbidden-token error.
  - User-facing web guidance: the Tools **My Profile** page and the Social Media Tools landing page now show the current account's SocialGPT/OpenAI limits directly, including approved-access state, daily budget usage, API request limiter, default model/output budget, and web-search availability.

- **SocialGPT verification now uses a separate web-search lookup and finalization layer instead of relying on the main answer call to use the web-search tool** – `POST /api/ai/socialgpt/respond` keeps the same endpoint shape, but verification-style modes now produce a preliminary AI answer first, perform a separate web-search lookup when verification is required, and then may finalize/revise the answer using that lookup evidence.
  - Behavioral guidance: request modes such as `verify`, `fact-check`, `factcheck`, `lookup`, `search`, `source-check`, `sources`, `user-analysis`, `analyze-user`, and `analysis` should be treated as verification-style modes when Tools marks `web_search.required=true`.
  - Behavioral guidance: if the separate web-search lookup works and supplies evidence, the final `response` may be a revised version of the preliminary answer, with source-aware wording and optional markdown links.
  - Behavioral guidance: if web search fails technically or does not provide usable independent evidence, Tools can still return the preliminary answer as `response`, but must not mark it as verified. Clients should show the answer with a warning rather than hiding it outright.
  - Additive response guidance: `web_search` can now also expose `failed`, nullable `error`, and `citations[]` (`url`, `title`) alongside `requested`, `required`, and `used`.
  - Additive verification guidance: `verification.status` can now also be `web_search_failed`; when status is `web_search_failed` or `independent_verification_missing`, `verification.independently_verified=false` even if a usable preliminary answer is present.
  - Rendering guidance: Android/native clients may receive longer verification/user-analysis text and markdown links in `response`; render long answers in a scrollable result area, and render links only through a safe markdown/sanitized-HTML path or show the structured `web_search.citations[]` links separately.

- **SocialGPT verify-mode web search is now enforced more strictly at the OpenAI adapter layer** – `POST /api/ai/socialgpt/respond` keeps the same request/response shape, but when Tools decides that verification/current-info checks require web search it now forces the Responses API web-search tool more reliably instead of relying only on the default-on toggle.
  - Behavioral guidance: when `request_mode="verify"` or the server-side heuristics set `web_search.required=true`, newer Tools builds now add the web-search tool even if the ordinary default-on setting is off, as long as global web-search support is still enabled on the host.
  - Behavioral guidance: if the host has Responses API disabled entirely while the same request requires mandatory web search, Tools now returns a clearer adapter error instead of silently falling back to Chat Completions for that verification path.
  - Behavioral guidance: OpenAI response parsing now also detects nested `web_search` / `web_search_call` tool usage deeper in the response payload, so `web_search.used` / `verification.web_search_used` are less likely to stay false only because the tool call was nested below the old top-level scan.

## Change sync (2026-05-10)

- **Microsoft auth is now exposed as a truly shared Microsoft / Graph layer instead of only a To Do-branded start helper** – Tools now also has one generic authenticated status surface and now prefers generic browser callback/start aliases suitable for broader Microsoft Entra / Graph integrations such as future Copilot-style flows.
  - New endpoint: `GET /api/microsoft/auth/status`.
  - Response guidance: can now expose additive `provider="microsoft"`, additive `platform="microsoft_graph"`, additive `auth_ready`, additive `callback_url`, additive `callback_legacy_url`, additive `supported_integrations[]`, additive `planned_integrations[]`, and additive `platform_app.supports_work_or_school_accounts` alongside the existing tenant/account-support diagnostics.
  - Routing guidance: the preferred browser callback/start aliases are now `/oauth/microsoft/callback`, `/oauth/microsoft/start`, and `/oauth/microsoft/start-link`, while the older `/oauth/microsoft-todo/*` paths still work as compatibility aliases.
  - Configuration guidance: newer hosts should prefer the shared `MICROSOFT_*` environment/config keys for the platform app, while the older `MICROSOFT_TODO_*` names remain accepted for backwards compatibility.

- **X bot opaque internal non-replyable blocks now try one last direct-reply recovery pass, and the admin recent-interaction list is paginated** – `/api/social-media-tools/x-bot/interactions*` can now surface clearer provider-side failure text when a structured attempt failed internally, and newer Tools builds may also recover one previously blocked interaction by running a final plain-text reply fallback before it stays blocked.
  - Behavioral guidance: when the structured reply ladder previously ended only in a vague `The AI marked this reply as non-replyable without explaining why.`, newer Tools builds now preserve the real provider/policy error text when available and may still salvage a short direct reply through one last plain-text recovery attempt.
  - Admin guidance: the Tools admin **Recent interactions** view is now paginated, so native/operator clients should not assume one large latest-only interaction batch is the only review shape operators see in the web UI.

- **X bot publishability and loop/rule behavior are now stricter about current-thread reality** – `/api/social-media-tools/x-bot/interactions*` can now mark more candidate replies as non-publishable before an operator hits the final X post attempt, and older stale context is less likely to hijack rule/loop decisions.
  - Behavioral guidance: when a stored interaction came from keyword polling or follow-up thread polling but the current tweet was not actually a direct mention/reply to the bot, newer Tools builds can now keep that interaction in a clearer `Do not publish` state instead of making it look publishable until X rejects the post.
  - Behavioral guidance: ultra-thin tweets that are effectively only one mention plus one URL are now less likely to inherit one older thread rule override just because earlier nearby context contained matching keywords.
  - Behavioral guidance: repetitive-AI loop detection now focuses on the latest exchange, so one older Grok-style duplicate farther back in the thread should not keep blocking a conversation that has already moved on.
  - Additive settings guidance: X-bot settings can now also expose `structured_reply_max_attempts` so operator/native clients can see how many structured public-reply attempts Tools is currently allowed to try before it gives up (current supported range `1..5`).
  - Behavioral guidance: when a known AI account such as `grok` appears in the thread together with multiple ordinary participants, newer Tools builds now deprioritize the AI account as reply focus and keep trying to answer the non-AI participants instead.
  - Behavioral guidance: when no keyword rule matched for one interaction, that should now be treated as an ordinary fallback-to-default-instruction case rather than as a refusal reason by itself.

- **X bot opt-out intent detection is now stricter and the admin UI can opt one author back in directly from one blocked interaction** – the same `/api/social-media-tools/x-bot/interactions*` responses can still expose `status="opted_out"`, but Tools is now less eager to infer that state from loose wording alone.
  - Behavioral guidance: generic complaints that merely contain words such as `stop` or Swedish `sluta` are no longer treated as opt-out commands unless the wording clearly asks the bot to stop replying/engaging (for example `opt out`, `stop replying`, or `sluta svara`). Bare `stop` / `sluta` on their own should also be treated as insufficient.
  - Behavioral guidance: older automatically stored false-positive opt-outs can now also auto-release when the same author later directly mentions/replies to the bot again in a normal non-opt-out message.
  - Additive settings guidance: X-bot settings can now also expose `opt_out_override_enabled`, `opt_out_exempt_usernames[]`, and `opt_out_exempt_user_ids[]` so operator/native clients can understand when stored opt-outs are globally overridden or bypassed for protected identities.
  - Behavioral guidance: protected participants such as `tornevall` are now treated as opt-out-exempt and should not be effectively blocked by stored X-bot opt-out rows.
  - Operator guidance: the Tools admin recent-interaction cards now also expose an **Opt in again** action so one false-positive stored opt-out can be removed immediately before the interaction is reprocessed.

- **SocialGPT verify flows now enforce a stricter independent-verification policy** – `POST /api/ai/socialgpt/respond` can now return additive verification-state metadata that distinguishes a real verified result from one where independent verification is still missing because OpenAI web search was required but not actually used.
  - Behavioral guidance: when the request requires current-info/source verification and `web_search.required=true` but `web_search.used=false`, newer Tools responses can now explicitly return a fallback answer stating that independent verification is missing instead of sounding verified.
  - Behavioral guidance: when verify-mode web search itself fails at the provider/tool layer, newer Tools builds now retry once without web search and degrade to the same `independent_verification_missing` outcome instead of hard-failing the entire verification call.
  - Additive response guidance: `verification` can now also expose additive `status` (`verified|independent_verification_missing|verification_prefix_missing|not_requested`), additive `status_message`, additive `web_search_required`, additive `web_search_used`, and additive `independently_verified`.

- **Microsoft OAuth now also has a more platform-neutral authenticated API start path** – the older Microsoft To Do helper still exists, but Tools now also exposes a generic alias better suited for one shared Microsoft app registration across the wider platform.
  - New recommended endpoint: `GET /api/microsoft/oauth/start`.
  - Compatibility guidance: `GET /api/microsoft-todo/oauth/start` still works as a legacy alias.
  - Additive response guidance: Microsoft status/start responses can now also expose `connect_api_legacy_url` alongside the primary `connect_api_url`.

- **X bot verification routing is now stronger for source/fact-check wording, and interactions can now expose additive RSS evidence context** – the same `/api/social-media-tools/x-bot/interactions*` responses can now reflect better fact-check classification for requests about verifying facts, checking sources, or asking for RSS/feed lookups.
  - Behavioral guidance: Swedish/English wording such as `verifiera`, `källor`, `belägg`, `source(s)`, or explicit RSS/feed search phrasing can now route one mention into the stronger fact-check path instead of leaving it in a generic ask flow.
  - Behavioral guidance: broader wording such as “what are the most relevant/latest news from the feed today?” should now also be treated as an RSS/feed lookup even when the post never literally says `search RSS`; when that kind of prompt contains no real topic keywords, Tools can now fall back to recent feed items instead of missing the RSS intent.
  - Behavioral guidance: when RSS evidence is enabled, Tools now also runs an internal RSS archive lookup continuously using OpenAI-selected search terms first and then a local SQL query; matching archive rows should be treated as optional supporting context rather than as something that automatically overrides the direct X-thread answer.
  - Behavioral guidance: when one X-bot interaction wanted verification/web search but the web-search tool was not actually used, Tools now retries once in a normal no-web-search reply mode instead of posting the repetitive “independent verification missing” sentence directly into the public thread.
  - Additive interaction guidance: `context_meta.mode_meta` can now also expose additive `fact_check_requested=true|false` and additive `rss_lookup_requested=true|false`.
  - Additive interaction guidance: `context_meta.rss_evidence` can now also expose `enabled`, additive `searched`, `used`, additive `keyword_source`, additive `search_reason`, additive `usage_hint`, `keywords[]`, and `items[]`, where each item may carry `content_id`, `title`, `feed_title`, `feed_category`, `publishby`, `link`, `published_at`, `matched_terms[]`, and `excerpt`.
  - Additive interaction guidance: `context_meta` can now also expose additive `web_search_required=true|false` and additive `web_search_used=true|false` so operator/native clients can tell whether current-info verification was expected to require OpenAI web search and whether the tool was actually used.
  - Additive interaction guidance: `reply_decision.verification_policy` can now also expose additive `fallback_used=true|false`, and `state` may now also be `normal_mode_fallback` when Tools deliberately retried in ordinary reply mode after the web-search-backed path was unavailable.

- **X bot interaction reprocess now restarts with the latest saved Tools rule analysis instead of only replaying stale state** – `POST /api/social-media-tools/x-bot/interactions/{interaction}/reprocess` keeps the same route shape, but Tools now explicitly clears the old generated candidate/decision state, reapplies the latest saved X-bot settings, reevaluates active keyword rules, and then generates a fresh candidate reply.
  - Behavioral guidance: operator/API-triggered reprocess is now the intended recovery path when one stored interaction got stuck on a weak earlier rule match, outdated instruction/mood, or another non-publishable candidate state.
  - Additive interaction guidance: refreshed interaction payloads can now also expose `context_meta.rule_evaluation` plus additive `context_meta.reprocess_meta`, and `context_meta.matched_rule` can now carry additive `score`, `matched_keywords[]`, and `matched_tokens[]` so admin/native clients can see why one rule won.

- **X bot interactions can now be marked finished when another AI account keeps repeating the same reply pattern** – Tools now exposes additive loop-guard metadata for the X-bot flow so admin/native clients can understand why one thread was intentionally stopped.
  - Behavioral guidance: when a known AI participant such as `grok` keeps sending the same or nearly the same answer pattern and the thread is no longer progressing meaningfully, Tools may now mark that interaction as effectively finished instead of continuing the follow-up loop for hours.
  - Behavioral guidance: newer Tools builds can now also apply a separate recent-window repetition safeguard to ordinary human conversations. That check is intentionally limited to roughly the latest `5..7` visible posts, can ask OpenAI whether the discussion is still moving forward, and may either nudge the next reply toward a new angle / clarifying question or mark the thread finished when the newest exchange has become a repetitive dead-end.
  - Additive interaction guidance for `/api/social-media-tools/x-bot/interactions*`: rows can now also expose `context_meta.loop_guard` with fields such as `reason_code`, `action`, `suppress_follow_up_polling`, `ai_account`, `author_username`, `matched_strategy`, `similarity_percent`, additive `comparison_post_ids[]`, additive `repeated_posts[]`, and additive human-readable `message`.
  - Publication guidance: loop-guarded interactions now also surface non-publishable metadata through the same response shape, including additive `reply_decision.reason_code="repetitive_ai_loop|recent_conversation_stalled"`, additive `publication_decision.source="loop_guard"`, and additive `publish_block_reason_code="repetitive_ai_loop|recent_conversation_stalled"` so operator clients do not need to infer the stop reason from free text only.

- **Microsoft To Do now also has an authenticated API OAuth-start helper and a less session-fragile callback path** – Tools can now generate a Microsoft authorization URL for already-authenticated API/native clients instead of forcing every connect flow to begin only from the web form.
  - New endpoint: `GET /api/microsoft-todo/oauth/start`.
  - Response guidance: returns `authorization_url`, additive `callback_url`, and additive `connect_web_url` for the currently authenticated user.
  - Additive status guidance: `GET /api/microsoft-todo/status` can now also expose `connect_api_url`, plus additive `platform_app.account_support_hint` and additive `platform_app.supports_personal_accounts` so clients can show clearer Microsoft account-type guidance before connect.
  - Behavioral guidance: `/oauth/microsoft-todo/callback` can now still finish the original OAuth transaction even if the browser lost its active Tools web session, as long as the signed OAuth `state` still matches the original user/transaction.
  - Account-type guidance: when the shared Microsoft app is expected to handle personal Microsoft accounts (`@outlook.com`, `@hotmail.com`, `@live.com`), operators should normally use tenant `common` or `consumers` and make sure the Azure app registration itself is enabled for personal accounts (MSA), otherwise Microsoft can answer with `unauthorized_client`.

- **Social Media Tools extension settings now also expose a Tools-side Facebook participant-request scanner toggle** – the same `GET|PUT /api/social-media-tools/extension/settings` contract can now also include additive `settings.facebook_participant_scanner_enabled`.
  - Behavioral guidance: this flag is intended for the browser extension's Facebook `/groups/.../participant_requests` helper, where visible participant-request cards can expose **Analyze in Toolbox** / **Verify facts** actions when the setting is enabled.
  - Compatibility guidance: this is an additive boolean setting; older clients can ignore it safely.

## Change sync (2026-05-07)

- **X bot config/status now also expose required closing hashtags for final replies** – the same `/api/social-media-tools/x-bot/status` and `/api/social-media-tools/x-bot/config` responses can now also include additive `settings.required_reply_hashtags[]`.
  - Behavioral guidance: when one or more hashtags are configured there, Tools now always moves those same hashtags to the very end of the final stored/posted reply, in the same order, even after local reply-shortening or repost preparation.
  - Compatibility guidance: treat this as an additive operator setting; older clients can ignore it, but newer admin/native clients should preserve the configured order when rendering/editing the list.

- **Session online-count responses can now also honor admin-managed custom bot/crawler user-agent rules** – `GET /api/sessions/online/count` keeps the same numeric response shape, but the server-side bot bucket is no longer limited to the built-in crawler signatures.
  - Behavioral guidance: when Tools admins add a custom online-session bot rule such as `dnsbl-engine-tools-client`, matching guest sessions are now counted under `bots` instead of `guests` everywhere the shared online counters are used.
  - Compatibility guidance: the payload schema is still unchanged (`users`, `guests`, `bots`, `humans`, `total`, `minutes`), so clients should treat the bot/guest split as configurable server-side logic rather than a fixed built-in signature list.

- **Mail Support Assistant case-sync now tolerates empty selected-rule placeholders for unmatched mail** – `POST /api/mail-support-assistant/cases/sync` keeps the same request shape, but Tools now normalizes optional selected-rule placeholders that older standalone/runtime clients may still send when no rule matched yet.
  - Compatibility guidance: clients should still prefer omitting `selected_rule_id`, `selected_rule_name`, and nested `selected_rule.id` entirely when no rule matched.
  - Behavioral guidance: when older payloads still send `selected_rule_id=0` (or an equivalent empty nested selected-rule id), Tools now treats that as “no selected rule” instead of rejecting the entire case-sync request with a generic `422`.

- **RSS now also has a dedicated operator posting-queue API for group/page publishing workflows** – Tools now exposes a permission-gated `/api/rss/posting-queue/items*` surface for internal operator/browser-automation flows.
  - Auth note: these endpoints use authenticated Tools web-session access (`web` + `auth:web`) together with the new dedicated permission `rss.posting.handle`; they are not public scraper endpoints.
  - New endpoints: `GET /api/rss/posting-queue/items` and `PATCH /api/rss/posting-queue/items/{contentId}`.
  - Query guidance for `GET /api/rss/posting-queue/items`: accepts additive `queue=review|group|page|done`, additive `category=<slug>`, additive `feed_id=<urlid>`, and additive `per_page=10..250`.
  - Response guidance: list payloads now include `filters`, `pagination`, and `items[]` where each row can expose `contentid`, `urlid`, `title`, `description`, additive `excerpt`, `link`, additive `feed_title`, additive `feed_category`, additive `entry_url`, and additive `queue_status` (`handle_group`, `handle_page`, `handled_group`, `handled_page`, additive `needs_group`, additive `needs_page`, additive `has_targets`, additive `is_done`).
  - Update guidance for `PATCH /api/rss/posting-queue/items/{contentId}`: callers can send one or more boolean fields `handle_group`, `handle_page`, `handled_group`, and `handled_page`, plus additive `queue` so the response can tell the current UI whether that row should disappear from the active filtered list.
  - Behavioral guidance: `review` mode hides fully handled rows by default while still showing unselected rows, `group` / `page` modes expose only pending target-specific rows, and rows drop out of those active queues automatically once the matching `handled_*` flag becomes true.

- **Session online-count responses can now also exclude admin-whitelisted internal IP/CIDR ranges from the live counters** – `GET /api/sessions/online/count` keeps the same response shape, but Tools can now hide trusted internal traffic from those numbers.
  - Behavioral guidance: when Tools admins add one exact IP or one CIDR range to the live online-session whitelist, matching session rows are removed from the shared online counters instead of still being counted as users/guests/bots.
  - Compatibility guidance: the payload schema for `/api/sessions/online/count` is unchanged (`users`, `guests`, `bots`, `humans`, `total`, `minutes`), but clients should treat those totals as already filtered server-side rather than assuming every active raw session is counted.

- **Session online-count responses now also split likely bots from ordinary guests** – `GET /api/sessions/online/count` no longer reports only users vs guests.
  - Additive response guidance: the payload can now also include `bots`, additive `humans` (`users + guests`), and additive `minutes` for the session lookback window.
  - Behavioral guidance: guest sessions that look like crawlers/link-preview bots (for example `Googlebot`, `curl`, `facebookexternalhit`, `headlesschrome`) are now counted under `bots` instead of inflating the ordinary guest bucket.

- **X bot interactions now also expose structured reply-decision JSON plus GPT-5/GPT-4 generation metadata** – admin/API consumers can now tell whether Tools considers a candidate reply actually postable instead of inferring that only from free-text reply text.
  - Additive interaction guidance for `/api/social-media-tools/x-bot/interactions*`: rows can now also expose top-level `reply_decision` with at least `message`, `can_reply`, and `status`, plus additive `model`, `reasoning_effort`, and other operator/debug fields when available.
  - Additive interaction guidance: the same rows can now also expose `reply_generation` with additive `selected_candidate`, additive `alternatives[]`, additive `attempts[]`, additive `non_replyable_attempts`, additive `max_attempts`, and additive `premium_capability` metadata describing the current best-effort X reply-capability guess.
  - Additive interaction guidance: the same rows can now also expose additive `publication_decision.display_state` plus additive `publication_decision.display_label`, so operator/native clients can distinguish an already-posted reply from a stricter current `do not publish` block without guessing from status text alone.
  - Additive interaction guidance: `reply_decision_human[]` can now carry a ready-to-render human-readable summary of the structured reply decision for recent-interaction views.
  - Behavioral guidance: when `reply_decision.can_reply=false`, clients should treat that as the authoritative non-publishable signal even if `reply_text` still contains a short human-readable fallback/explanation string.
  - Behavioral guidance: Tools now escalates GPT-5 reasoning effort step-by-step for X-bot replies (`low` → `medium` → `high` → `xhigh`) and then also tries `gpt-4o` as the fifth/final simpler fallback attempt before it gives up.

- **X bot interaction payloads now also expose reply-shortening rerun cost metadata** – admin/API consumers can now see how many times Tools had to re-run or compact a stored candidate reply before it fit the configured character cap.
  - Additive interaction guidance for `/api/social-media-tools/x-bot/interactions*`: rows can now also expose top-level `reply_rerun_attempts` and additive `reply_rerun_history[]`.
  - Additive context guidance: the same data is also mirrored inside `context_meta.reply_postprocess.rerun_attempts` plus `context_meta.reply_postprocess.rerun_history[]`, where each history row can contain `attempt`, `status`, `before_chars`, and `after_chars`.

- **X bot candidate replies are now normalized from Markdown to plain text before storage/posting** – admin/API consumers should now expect raw URLs instead of Markdown link syntax inside stored reply text.
  - Behavioral guidance for `/api/social-media-tools/x-bot/interactions*`: reply text that previously could contain Markdown such as `[label](https://example.com)` is now flattened to ordinary plain text with the raw URL kept visible for X posting.
  - Behavioral guidance: the same plain-text normalization also applies to structured reply-decision text such as `reply_decision.message` / `reply_decision.status`, so clients should no longer render those fields as Markdown.

- **X bot now also pages deeper through earlier same-thread context before building a reply** – admin/API consumers can now see richer capture metadata for how much earlier X conversation context Tools actually collected.
  - Behavioral guidance: when the current interaction belongs to a longer X conversation, Tools can now fetch multiple search pages from that same `conversation_id` instead of stopping after one shallow context pass.
  - Behavioral guidance: replies that were posted later than the current mention are now filtered out from that earlier-thread capture so the bot does not judge a post against future comments.
  - Additive context guidance for `/api/social-media-tools/x-bot/interactions*`: `context_meta.context_source.conversation` can now include fields such as `fetch_target`, `pages_requested`, `pages_succeeded`, `posts_collected`, `filtered_newer_posts`, and `truncated`.

- **Managed frontend script-box feed bundles now accept explicit widget filters** – the public `/api/managed-scripts/feed*` surface can now carry additive filter query parameters so one embeddable bundle can target selected feeds/groups without custom URL parsing in every widget.
  - Additive query guidance for both `GET /api/managed-scripts/{surface}` and `GET /api/managed-scripts/{surface}/bundle.js`: the `feed` surface now also accepts `feed_ids=63,91` or `feeds=63,91`, plus `categories=...`, `groups=...`, or `category_slugs=...`, and optional `limit=1..100`.
  - Additive response guidance: `GET /api/managed-scripts/{surface}` can now also expose `query_context` with normalized `filters.feed_ids[]`, `filters.category_slugs[]`, `filters.limit`, and `has_filters`.
  - Bundle guidance: the generated JavaScript bundle now also exposes the same normalized filter payload as `window.__toolsManagedScriptBoxes.context.filters`, so browser widgets can read the requested feed/category scope directly from the loaded bundle.

## Change sync (2026-04-29)

- **Whisper now also has a dedicated token-authenticated transcription API with required callbacks and a separate API queue channel** – Tools now exposes an additive `/api/whisper/transcribe/*` surface for server-to-server integrations that should not rely on a signed-in web/JWT user session.
  - Auth note: this token API uses a dedicated active personal token with provider `provider_whisper_api` sent through `Authorization: Bearer`, `X-Api-Key`, or the legacy `apikey` transport, and the token owner must also have additive `whisper.api` permission plus the ordinary `whisper.use` access (admin bypass still applies).
  - New endpoints: `POST /api/whisper/transcribe`, `GET /api/whisper/transcribe/status`, `GET /api/whisper/transcribe/jobs`, and `GET /api/whisper/transcribe/jobs/{jobId}`.
  - Queue behavior: token-submitted jobs now still appear in the ordinary Whisper queue/detail surfaces but carry additive `queue_channel="api"` / `queue_channel_label="API queue"`, while the existing signed-in queue keeps additive `queue_channel="web"` / `queue_channel_label="Web queue"`.
  - Callback guidance: `POST /api/whisper/transcribe` now requires `callback_url`, and when an API job reaches terminal `completed|failed`, Tools sends one JSON callback containing the final job payload, transcript/analysis metadata, additive callback status metadata, and a direct public transcript `share.url` when the transcript completed successfully.
  - Priority guidance: admin-owned Whisper jobs are now claimed before ordinary jobs in both queue channels, so Android/admin clients consuming ordinary `/api/whisper/jobs*` payloads can now also see additive `queue_channel*` metadata change order even though execution still happens asynchronously.
  - Additive job-field guidance: ordinary `/api/whisper/jobs*` payloads and the new token `/api/whisper/transcribe/jobs*` payloads can now also expose additive `callback` (`url`, `status`, `http_status`, `last_attempt_at`, `delivered_at`, `error`) plus additive `share` metadata when a transcript share already exists.

- **Whisper queue jobs now support separate analysis-language preference, additive transcript-translation targets, per-job diarization opt-out, and more visible live progress updates** – Tools now lets callers describe more of the post-transcript AI behavior when a job is queued.
  - Additive request guidance for `POST /api/whisper/jobs`: callers can now also send optional `analysis_language`, additive `translation_target_languages[]`, and additive `disable_diarization=true|false` alongside the older `source_url|media_file`, `model`, `language`, `source_label`, and `source_note` fields.
  - Behavioral guidance: the existing `language` field is still Whisper's own transcription-language hint. The new `analysis_language` is separate and only controls the OpenAI transcript-analysis output language.
  - Fallback guidance: when `analysis_language` is omitted/empty, transcript analysis now follows the transcript language first (including light transcript-text language guessing when Whisper itself stayed on `auto`) instead of inventing a separate unrelated output language.
  - Translation guidance: when `translation_target_languages[]` contains one or more target codes and the job owner has OpenAI access, Tools now attempts automatic transcript translations after completion and stores one result per selected target language.
  - Diarization guidance: diarization is now treated as enabled by default per job whenever the host-wide Whisper diarization feature is available; `disable_diarization=true` is therefore the explicit per-job opt-out.
  - Additive job-field guidance: Whisper job payloads can now also expose `analysis_language_preference`, additive `analysis.language`, additive `translation_target_languages[]`, additive `translations[]` (each row may contain `target_language`, additive `target_language_label`, `status`, additive `text`, additive `model`, additive `updated_at`, additive `error`, additive `source_language`, additive `source_language_label`, and additive `truncated`), plus additive `diarization_requested=true|false`.
  - UX guidance: queue/detail payloads now also refresh stage detail more often during long `transcribing` periods, so clients should keep surfacing `stage_label`, `stage_detail`, `stage_updated_at`, `runtime_log[]`, and the additive `processing_elapsed_*` / throughput metadata instead of assuming progress only moves when raw Whisper emits percentage lines.

- **Whisper now attempts best-effort speaker diarization automatically after every successful transcription** – when `WHISPER_DIARIZATION_ENABLED=true`, Tools now treats diarization as an automatic post-step after the transcript itself has already been saved.
  - Behavioral guidance: Whisper still produces the transcript; diarization is separate audio analysis that tries to group likely speakers by timestamp overlap and map generic `SPEAKER_XX` labels back onto stored Whisper segments.
  - Guardrail guidance: diarization never downgrades or deletes a successful transcript. If diarization fails because of missing `pyannote.audio`, missing `torch`, missing Hugging Face token, gated-model access, timeout, empty result, or other process/runtime failure, the job still stays completed and `transcript_text` remains the primary result.
  - Additive status guidance: `GET /api/whisper/status` can now also expose `config.diarization` with fields such as `enabled`, `provider`, `provider_supported`, `hf_token.configured`, `hf_token.status` (`present|missing`), optional `min_speakers`, optional `max_speakers`, additive `timeout_seconds`, and additive `warning` carrying the speaker-label disclaimer.
  - Additive job guidance: Whisper job payloads can now also expose `diarization` metadata with fields such as `status` (`pending|running|completed|failed|skipped|unavailable`), `provider`, `updated_at`, additive `error`, additive `warning`, additive `speaker_count`, additive `labelled_segment_count`, and additive `speaker_labels[]`.
  - Additive transcript guidance: full-detail Whisper job payloads can now also expose additive `transcript_segments[]`, where each segment row can include `start`, `end`, `text`, and nullable `speaker_label`, plus additive `speaker_aware_transcript` for a formatted line-by-line transcript using those generic speaker labels when available.
  - UX guidance: clients should treat `transcript_text` as the primary result and treat speaker labels as estimated helper metadata only. The backend warning text `Talare är automatiskt uppskattade och kan vara fel.` should be surfaced whenever speaker-labelled output is shown.

## Change sync (2026-04-27)

- **Whisper queue now has first-class yt-dlp handling for supported page/video URLs** – Tools no longer tries to transcribe downloaded HTML when a Whisper URL job points at a YouTube-style page instead of a direct media file.
  - Behavioral guidance: uploaded-file jobs are unchanged and still use the stored upload path directly; they never go through yt-dlp.
  - Behavioral guidance: direct media URLs still use the older HTTP downloader, but obvious non-media responses such as `text/html` are now rejected before `input.bin` is written.
  - Behavioral guidance: supported page/video hosts such as `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, and `music.youtube.com` are now downloaded/extracted through yt-dlp into the Whisper job directory before transcription starts.
  - Additive status guidance: `GET /api/whisper/status` can now also expose `config.ytdlp_configured=true|false` so clients can tell whether the current host is expected to handle YouTube-style URLs.
  - Additive job guidance: for yt-dlp-backed URL jobs, stored `media_path` now points at the actual extracted audio file inside `storage/app/whisper/jobs/{id}` rather than a saved HTML page or placeholder `input.bin`.

- **DNS ACME helper endpoints added under the existing DNS API** – Tools now exposes a narrow `/api/dns/acme/*` surface for `_acme-challenge` TXT management used by console/automation flows.
  - New endpoints: `POST /api/dns/acme/present`, `POST /api/dns/acme/cleanup`, and `POST /api/dns/acme/cleanup-stale`.
  - Auth note: these endpoints currently reuse the same `/api/dns/*` auth model as ordinary DNS writes (web session, API key, or IP-whitelist fallback where allowed); there is no separate ACME token model yet.
  - Request guidance: `present` expects `domain`, `challenge`, and optional `ttl`; `cleanup` expects `domain` plus the exact `challenge`; `cleanup-stale` expects `domain` plus optional `keep_challenges[]`, additive `dry_run`, and additive `refresh_zone_cache`.
  - Response guidance: ACME responses can now expose `ok`, `message`, `owner`, `zone`, `challenge`, additive `ttl`, additive `removed[]`, additive `removed_count`, additive `kept[]`, additive `dry_run`, and additive `errors[]` depending on endpoint.
  - Behavioral guidance: these helpers normalize the requested domain to one `_acme-challenge.<domain>` owner name, write/delete exact TXT rows through the normal DNS update service, and can explicitly stale-clean older challenge values while preserving a keep-list.

- **Managed frontend script-box API added for vBulletin/frontend snippets and feed widgets** – Tools now exposes a small public `/api/managed-scripts/*` surface for reusable JavaScript bundles that can be embedded on external sites.
  - New endpoints: `GET /api/managed-scripts/{surface}` and `GET /api/managed-scripts/{surface}/bundle.js`.
  - Allowed surface values right now: `vbulletin` and `feed`.
  - Response guidance for `GET /api/managed-scripts/{surface}`: payload now includes `ok`, `surface`, `count`, additive `bundle_url`, additive `bundle_tag`, additive `scripts[]`, and additive `merged_script`.
  - Query guidance: `GET /api/managed-scripts/{surface}?format=both|merged|separate` can now return both the separated rows and the merged bundle text or either view alone.
  - Script-row guidance: each `scripts[]` row can now expose `id`, `surface`, `title`, `script_body`, `script_src`, `ai_instruction`, `sort_order`, `is_enabled`, `updated_by_user_id`, and `updated_at`.
  - Bundle guidance: `GET /api/managed-scripts/{surface}/bundle.js` returns executable JavaScript with `Content-Type: application/javascript`, intended for direct browser usage through a normal `<script src="…"></script>` tag.
  - Behavioral guidance: the merged bundle currently includes active boxes only, sorts them by `sort_order` then `id`, injects any saved external `script_src` rows, and executes inline `script_body` rows once per page load behind an internal duplicate-init guard.

- **Whisper jobs now also accept uploaded files, not only URLs** – `POST /api/whisper/jobs` now supports either the older `source_url` mode or a multipart upload via `media_file`.
  - Request guidance: send **either** `source_url` or `media_file`, never both in the same job.
  - Upload guidance: file jobs are submitted as `multipart/form-data`; the older JSON/form body with `source_url` still works unchanged for remote media.
  - Additive response guidance: Whisper job payloads can now also expose `source_type`, `source_label`, `source_mime`, and `source_size_bytes` so clients can render readable source information for uploaded jobs.
  - Status guidance: `GET /api/whisper/status` can now also expose `config.upload_max_mb` so clients can block too-large file uploads before submit.

- **Whisper queue rows can now be reset/restarted after failure, and the built-in default-model fallback is now `turbo` instead of `small`** – Tools now exposes both bulk and per-job retry behavior for exhausted Whisper jobs.
  - New endpoint: `POST /api/whisper/jobs/{jobId}/restart` resets one visible failed/queued job and starts it again immediately.
  - Additive request guidance for `POST /api/whisper/run-now`: the body can now also include `reset_failed=true|false`, which resets all failed/exhausted rows back to `queued` before the run starts.
  - Additive job-field guidance: Whisper job payloads can now also expose `can_restart_now` and `can_reset_for_retry` so clients can enable/disable retry actions cleanly.
  - Model guidance: request `model` still wins when supplied, otherwise Tools uses configured `WHISPER_DEFAULT_MODEL`, and if that setting is absent/invalid the built-in fallback is now `turbo`.

## Change sync (2026-04-28)

 - **Completed Whisper jobs can now auto-populate transcript analysis before the operator asks for it manually** – Tools now attempts the same transcript-summary flow automatically as soon as a transcription finishes successfully.
  - Behavioral guidance: when the job owner has OpenAI access (`provider_openai`) or admin bypass, the backend now tries to generate the transcript analysis immediately after transcription and before the terminal-state owner mail is sent.
  - Additive job guidance: `GET /api/whisper/jobs*` and `GET /api/whisper/jobs/{jobId}` may therefore already return `analysis.status/text/model/updated_at/error` for newly completed rows even if the client never called `POST /api/whisper/jobs/{jobId}/analyze`.
  - Compatibility guidance: `POST /api/whisper/jobs/{jobId}/analyze` still exists for explicit reruns/manual analysis; clients should treat automatic analysis as best-effort rather than guaranteed for every owner/account.

  - **Whisper source presentation now favors labels/notes and redacts internal storage paths in outward-facing status text** – Tools now lets callers give URL jobs a clearer title plus optional operator note, and the returned stage/error text is more careful about hiding precise local storage/cache paths.
    - Additive request guidance for `POST /api/whisper/jobs`: callers can now also send optional `source_label` and `source_note` fields.
    - Additive job-field guidance: Whisper job payloads can now also expose `source_note` for the stored operator comment/context.
      - Additive job-field guidance: Whisper job payloads can now also expose `source_duration_seconds` plus formatted `source_duration_human` when the host could probe the clip length after upload/download.
    - Behavioral guidance: `stage_detail`, `runtime_log[]`, and `last_error` in the web/API job payloads now prefer redacted/internal-location wording instead of exposing exact local `storage/*` or cache file paths when those paths would otherwise leak in user-facing status text.

    - **Whisper queue status now also reports configured CPU thread tuning for the current host** – the same `GET /api/whisper/status` contract can now expose additive runtime-thread metadata.
      - Additive status guidance: `config.cpu_threads` can now show the effective `WHISPER_CPU_THREADS` value (or `0` when unset/auto), so clients/admin surfaces can tell whether the host is pinned to a specific CPU-thread count.
      - Additive job-field guidance: Whisper job payloads can now also expose `cpu_threads_configured`, `processing_elapsed_seconds`, `processing_elapsed_human`, `observed_throughput_multiplier`, and `observed_throughput_summary` so clients can show how fast the current job is moving relative to realtime audio and which CPU-thread cap the runner is actually using.

- **Whisper jobs now also expose explicit liveness/heartbeat metadata and stale processing rows are reclaimed automatically** – the same `/api/whisper/jobs*` responses can now also include additive runner-health fields so clients can tell whether a job is still alive or only looks stuck.
  - Additive job-field guidance: Whisper job payloads can now also expose `liveness` with fields such as `state` (`inactive|active|quiet|suspect|stale`), `summary`, `heartbeat_at`, `heartbeat_age_seconds`, `last_output_at`, `last_output_age_seconds`, `runner_id`, `current_step`, `stale_after_seconds`, and `is_stale`.
  - Behavioral guidance: when a later queue pass sees an old `downloading` / `transcribing` / `finalizing` row whose heartbeat has gone stale, Tools now requeues or fails that row explicitly instead of leaving it silently stuck forever.

- **Whisper now prefers the highest-quality default model again and can summarize completed transcripts on demand** – the built-in Whisper fallback is no longer `turbo`.
  - Model guidance: request `model` still wins when supplied, otherwise Tools now prefers configured `WHISPER_DEFAULT_MODEL`, and if that setting is absent/invalid the built-in fallback is now `large`.
  - New endpoint: `POST /api/whisper/jobs/{jobId}/analyze` runs an OpenAI summary/analysis for a completed transcript that the caller is already allowed to see.
  - Guardrail guidance: transcript analysis only works after Whisper finished successfully and the caller also has OpenAI access (`provider_openai`) unless admin bypass applies.
  - Compatibility guidance: if the active chat model/provider rejects `reasoning_effort`, Tools now retries the same transcript-analysis request once without that argument instead of failing immediately.
  - Additive job-field guidance: Whisper job payloads can now also expose `can_analyze_transcript` plus additive `analysis` metadata with fields such as `status`, `text`, `model`, `updated_at`, and `error`.

- **Whisper status now also reports whether yt-dlp cookies are configured for login-bound downloads** – the same `GET /api/whisper/status` contract now exposes additive cookie capability metadata.
  - Additive status guidance: `config.ytdlp_cookies` can now expose `configured`, `source` (`database|file|none`), additive `line_count`, and when applicable additive admin-facing metadata such as `updated_at` / `updated_by_user_name`.
  - Behavioral guidance: the server can now keep a Netscape-format cookie jar in Tools admin, materialize it temporarily for yt-dlp during YouTube/login-bound extraction, and then remove the temporary cookie file again.

- **Old Whisper jobs can now be deleted, especially failed rows that are no longer needed** – Tools now exposes `DELETE /api/whisper/jobs/{jobId}` for visible Whisper jobs and now reports whether a row is deletable right now.
  - Visibility/auth guidance: ordinary users can delete only their own visible Whisper jobs; managers/admins can delete any visible Whisper job, using the same authenticated `whisper.use` model as the other Whisper job endpoints.
  - Guardrail guidance: active processing rows (`downloading`, `transcribing`, `finalizing`) are not deletable and return a validation-style failure until they finish or fail.
  - Additive job-field guidance: Whisper job payloads can now also expose `can_delete` so clients can hide or disable delete actions while a job is still actively processing.
  - Storage guidance: successful delete calls remove the job row together with its stored Whisper project directory and safe local upload/transcript files; clients should treat delete as permanent cleanup rather than a soft-hide action.

- **Whisper jobs now also expose richer operator-progress metadata while yt-dlp / Whisper are running** – the same `/api/whisper/jobs*` responses can now also include additive runtime stage fields.
  - Additive job-field guidance: job payloads can now also expose `stage_label`, `stage_detail`, `stage_updated_at`, and `runtime_log[]` so clients can show what the runner was doing most recently (for example starting yt-dlp, current download line, or current Whisper command stage).
  - UX guidance: mobile clients can keep treating `progress_percent` as the coarse progress bar, but should surface `stage_label` / `stage_detail` when present because those fields explain why a job appears stalled or why a failed row never reached transcript finalization.
  - Additive operator guidance: for YouTube-style jobs, Tools now starts with `anonymous_temp` first, falls back to `db_temp` and then `raw_file_temp` only on explicit access-required failures, always copies cookie sources into temporary yt-dlp files instead of handing over the originals directly, and now also supports explicit yt-dlp JavaScript-runtime configuration (`WHISPER_YTDLP_JS_RUNTIMES` / `WHISPER_YTDLP_NODE_BIN`) so the surfaced `n challenge` failures can point more directly at missing Node.js or another supported JS runtime on the queue host.

- **Password Manager now has a first authenticated API contract** – Tools now exposes a first `/api/password-manager/*` surface for the logged-in owner's own encrypted vault entries.
  - Auth note: the first implementation accepts the same signed-in web-session or JWT bearer model already used by other user APIs such as Microsoft To Do and Whisper.
  - Endpoints: `GET /api/password-manager/entries`, `GET /api/password-manager/entries/{entryId}`, `POST /api/password-manager/entries`, `PUT /api/password-manager/entries/{entryId}`, `PATCH /api/password-manager/entries/{entryId}`, and `DELETE /api/password-manager/entries/{entryId}`.
  - Response guidance: list responses now expose masked rows with fields such as `id`, `entry_type`, `label`, `website_url`, `favorite`, `summary`, additive `card_last_four`, `last_viewed_at`, `created_at`, and `updated_at`.
  - Detail guidance: explicit read/create/update responses can now also expose decrypted `secret_payload` plus additive `meta_json`; clients should avoid logging, caching, or screenshotting that payload casually.
  - Cache guidance: this API currently sends `Cache-Control: no-store, private` and should be treated as high-sensitivity data.
  - Planning guidance: internal Android-prep material for stronger future unlock/session/device behavior still lives in the Tools repo under `agents-collection/AGENTS-PASSWORD-MANAGER-ANDROID-PREP.md`.

- **X mention bot dry-run/admin/API foundation added under Social Media Tools** – Tools now exposes a first admin/API surface for an X mention bot that is intended to answer only when explicitly mentioned on X.
  - Current auth note: the first `/api/social-media-tools/x-bot/*` surface uses authenticated Tools web-session access with `social-media-tools.manage`; personal/mobile bearer auth for this area is not defined yet.
  - New endpoints: `GET /api/social-media-tools/x-bot/status`, `GET|PUT /api/social-media-tools/x-bot/config`, `GET /api/social-media-tools/x-bot/diagnostics`, `POST /api/social-media-tools/x-bot/poll-now`, `GET /api/social-media-tools/x-bot/interactions`, `GET /api/social-media-tools/x-bot/interactions/{interaction}`, `POST /api/social-media-tools/x-bot/interactions/{interaction}/reprocess`, `POST /api/social-media-tools/x-bot/interactions/{interaction}/approve`, `POST /api/social-media-tools/x-bot/interactions/{interaction}/skip`, `GET /api/social-media-tools/x-bot/opt-outs`, `POST /api/social-media-tools/x-bot/opt-outs`, and `DELETE /api/social-media-tools/x-bot/opt-outs/{xUserId}`.
  - Response guidance: status/config responses now expose one primary bot account with `x_user_id`, `username`, `display_name`, booleans such as `enabled` / `reply_enabled`, and a `settings` object containing dry-run, polling, AI model, max-context/max-length, rate-limit, known-AI-account, and directed-account toggles.
  - Interaction guidance: X interaction rows can now expose `x_post_id`, `x_author_id`, `x_author_username`, `conversation_id`, `reply_post_id`, `mode`, `status`, `incoming_text`, `reply_text`, additive `context_meta`, additive `error`, `attempts`, and `processed_at`.
  - Posting note: the first implementation is dry-run-first. Diagnostics may explicitly report that write credentials are unavailable even when read/bootstrap credentials are configured.

- **X mention bot config now also exposes fallback instruction/mood, keyword rules, manual-review notification switches, and delayed auto-approve metadata** – the same `/api/social-media-tools/x-bot/status` and `/api/social-media-tools/x-bot/config` responses can now also include additive operator-routing fields.
  - Additive settings guidance: `settings` can now also expose `custom_instruction`, `mood`, `trigger_keywords[]`, `mentions_only`, `max_poll_pages`, `auto_approve_enabled`, `auto_approve_min_delay_seconds`, `auto_approve_max_delay_seconds`, `manual_review_notifications_enabled`, `manual_review_mail_enabled`, and `manual_review_slack_enabled`.
  - Additive rules guidance: account/config responses can now also expose `rules[]`, where each row may contain `id`, `name`, `sort_order`, `is_active`, `if_condition`, `instruction`, and `mood`.
  - Additive interaction guidance: `context_meta` on interaction rows can now also expose `matched_rule`, `applied_custom_instruction`, `applied_mood`, `trigger_match_terms[]`, `ingest_source`, `ingest_sources[]`, `auto_approve_due_at`, and `auto_approve_delay_seconds` when Tools already resolved a rule and/or scheduled delayed auto-posting.
  - Polling behavior note: mention polling now walks multiple X result pages per cycle instead of only one page, and when `settings.mentions_only=false` plus `settings.trigger_keywords[]` is populated it can also ingest recent public X posts that match those configured trigger words (for example `Tornevall`).

- **X bot status/config now also mirrors webhook state and last known remote X rate-limit windows** – the same `/api/social-media-tools/x-bot/status` and `/api/social-media-tools/x-bot/config` responses can now also include additive realtime-ingest and X-header state.
  - Additive settings guidance: `settings` can now also expose `webhook_enabled`, `webhook_url`, `webhook_last_received_at`, `webhook_last_processed_at`, `webhook_last_error_at`, and `webhook_last_error`.
  - Additive rate-limit guidance: `settings.remote_read_rate_limit` and `settings.remote_write_rate_limit` can now include `limit`, `remaining`, `reset_at`, `next_allowed_at`, `last_checked_at`, `last_status`, and `source`, reflecting the last X headers Tools stored for read/write calls.
  - Manual poll guidance: `POST /api/social-media-tools/x-bot/poll-now` now behaves like an explicit operator override — it bypasses the local poll-interval gate once and can also return additive `auto_approve` summary data for due delayed replies.

- **X bot prompt shaping now supports structured JSON context plus multimodal image URL forwarding** – the same `/api/social-media-tools/x-bot/status` and `/api/social-media-tools/x-bot/config` responses can now also expose additive prompt-shaping settings.
  - Additive settings guidance: `settings` can now also expose `context_format` (`text|json`), `image_url_forwarding_enabled` (`true|false`), `max_context_posts` (up to `50`), and `max_reply_length` where `0` means no local Tools character cap.
  - Behavioral guidance: `context_format=json` means Tools now builds one nested JSON payload for OpenAI containing the incoming post, mode metadata, visible context posts, reply constraints, and any forwarded image URLs instead of only a flat prose block.
  - Multimodal guidance: when `image_url_forwarding_enabled=true` and X exposes usable media URLs, Tools can now forward those URLs to OpenAI as multimodal `image_url` inputs rather than relying only on `media_summary` / alt text, and it now prefers inline image-data attachments when the server can fetch the image safely.
  - Additive link-context guidance: when `settings.link_handling_enabled=true` and visible context posts contain external URLs, Tools can now fetch a few linked pages server-side and include compact title/excerpt summaries in the AI context instead of assuming the model will browse those pages itself.
  - Additive interaction guidance: `context_meta` on interaction rows can now also expose `context_format`, `image_url_forwarding_enabled`, `forwarded_image_urls[]`, additive `forwarded_image_transports[]`, additive `linked_page_fetch`, and additive `linked_pages[]` for operator/debug visibility.

- **X bot now keeps a local per-conversation history archive with separately configurable depth** – the same `/api/social-media-tools/x-bot/status` and `/api/social-media-tools/x-bot/config` responses can now also expose additive local-memory settings.
  - Additive settings guidance: `settings` can now also expose `historical_context_max_posts` (integer, where `0` means effectively unlimited local archive depth).
  - Behavioral guidance: this local archive is separate from `max_context_posts`; Tools can keep much more conversation history locally than it forwards to OpenAI in one prompt.
  - Deleted-post guidance: when older X posts disappear upstream, Tools can now still reuse locally archived conversation rows and prior bot replies from interaction metadata instead of depending only on live X fetches.
  - Additive interaction guidance: `context_meta` on interaction rows can now also expose `historical_context_posts[]` and `historical_context_count`.

- **X bot directed-account routing now uses trusted admin usernames plus a blocked-target denylist** – the same `/api/social-media-tools/x-bot/status` and `/api/social-media-tools/x-bot/config` responses can now also expose additive operator-routing lists for directed-account mode.
  - Additive settings guidance: `settings` can now also expose `directed_allowed_author_usernames[]`, `directed_admin_usernames[]`, and `directed_blocked_target_usernames[]`.
  - Behavioral guidance: `directed_admin_usernames[]` are extra-trusted X usernames that remain authorized for directed-account commands even outside the normal delegate list.
  - Behavioral guidance: `directed_blocked_target_usernames[]` is a denylist of accounts the bot must not be told to approach through directed-account mode; this replaces the earlier target-allowlist concept.
  - Additive interaction guidance: `context_meta.mode_meta` can now also expose `blocked_target_usernames[]` and `admin_directed_author` alongside the older directed-account metadata.

- **X bot now also detects explicit concise-answer requests in mention text** – interaction mode metadata can now also tell operator/debug clients when the bot was asked to answer briefly.
  - Additive interaction guidance: `context_meta.mode_meta` can now also expose `concise_intent=true|false` when the newest post contains requests such as `Kortfattat!`, `briefly`, `short answer`, or `one sentence`.
  - Behavioral guidance: when `concise_intent=true`, Tools now tightens brevity instructions, lowers the output-token budget, and trims the generated reply more aggressively before posting.

- **X bot now also treats bare bot-tag mentions as prior-thread context requests** – interaction mode metadata can now also tell operator/debug clients when the mentioning user effectively wrote nothing except the bot tag.
  - Additive interaction guidance: `context_meta.mode_meta` can now also expose `tag_only_context_request=true|false` when the newest post is effectively just the bot mention (optionally with punctuation/emoji only).
  - Behavioral guidance: when `tag_only_context_request=true`, Tools now treats that as an implicit request to inspect the earlier visible thread and comment on what the discussion contains instead of acting as if the bare tag were the whole message.

- **X bot interaction rows now also expose additive reply-length/postprocess metadata plus clearer posting-permission wording** – the same `/api/social-media-tools/x-bot/interactions*` responses can now surface more detail about how candidate replies were shortened.
  - Additive interaction guidance: `context_meta.reply_length` can now include `current_chars`, `body_chars`, `prefix_chars`, `local_limit`, `x_limit`, `effective_limit`, `body_limit`, and `within_limit` for the stored candidate reply.
  - Additive interaction guidance: `context_meta.reply_postprocess` can now include `applied`, `attempts`, `strategy`, `original_chars`, `final_chars`, and `used_ai_rewrite` when Tools had to shorten a candidate reply before storing/posting it.
  - Posting-failure guidance: if an approve/post action comes back with the exact text `You are not permitted to perform this action.`, Tools now treats that as a likely X-side write/reply permission problem for the app/token pair rather than as a character-length failure.
  - Additive interaction guidance: `context_meta.automatic_post_block_reason` can now explain why a queued reply must stay manual-only even though reprocess still works (for example when the post was ingested from keyword polling and X has not actually engaged the bot in that thread).

- **X bot now keeps keyword-only public-thread replies manual-only by default** – automatic posting is no longer treated as safe for every queued interaction.
  - Behavioral guidance: when an interaction came in only from trigger-keyword polling or webhook keyword ingest and the bot account was not explicitly mentioned or replied to by the author, Tools now disables auto-post for that row and leaves it queued for manual approve/post instead.
  - Posting-failure guidance: if X returns the text `Reply to this conversation is not allowed because you have not been mentioned or otherwise engaged by the author of the post you are replying to.`, Tools now interprets that as a thread-engagement restriction rather than as a length problem.

- **X bot config can now also expose optional visible-mention prefix behavior for replies** – the same `/api/social-media-tools/x-bot/status` and `/api/social-media-tools/x-bot/config` responses can now also surface whether Tools should visibly prepend `@author` in reply text.
  - Additive settings guidance: `settings.reply_prefix_with_author` can now be used as an operator toggle; threaded posting itself still comes from X's `reply.in_reply_to_tweet_id`, so this prefix is optional compatibility behavior rather than a reply-threading requirement.
  - Behavioral note: Tools now persists that toggle correctly again when the X bot config is saved, so mobile/admin clients should treat `false` as the normal “no visible @author prefix” state rather than expecting implicit tagging.

- **Public X webhook endpoint added outside the Social Media Tools prefix** – Tools now also exposes an unauthenticated webhook surface dedicated to X platform callbacks.
  - Endpoints: `GET /api/x-bot/webhook` for CRC verification and `POST /api/x-bot/webhook` for signed event deliveries.
  - Auth/security note: this endpoint does not use Tools web-session auth; POST trust is based on X webhook signature verification against the configured X consumer secret.
  - Behavioral note: webhook ingest is gated by X bot config (`webhook_enabled`). When disabled, signed deliveries can return a disabled/ignored response instead of creating interactions.

- **Mail Support Assistant case sync now preserves remote-readable headers plus raw body variants** – `POST /api/mail-support-assistant/cases/sync` can now also accept additive inbound fields `headers_raw`, `headers_map`, and `body_text_raw` in addition to the earlier `body_text`, `body_text_reply_aware`, and `body_html` fields.
  - Intended use: standalone/support operators can reopen a Tools-side case and inspect stored headers plus raw/plain/HTML body variants instead of only short excerpts.
  - Additive behavior: handled/ignored/manual outcomes should now still be synced back into Tools even when the standalone runner could not build a stable local message-state key from the inbound mail.

- **Mail Support Assistant case/list responses can now expose richer stored message content** – case-message rows returned from the Tools-side case store can now also include additive `headers_raw`, `headers_json`, `body_text_raw`, `body_text`, `body_text_reply_aware`, and `body_html` fields for remote operator inspection.
  - Intended use: native/support clients that consume Tools-side case history can now render something closer to a real remote mail-client view without relying only on `body_excerpt`.

- **Firewall live child-control unblock calls now support selected child-IP scope too** – `POST /api/firewall/children/{child}/unblock` can now also accept additive `target_scope` (`all_child_ips|selected_child_ips`) plus `child_ip_address_ids[]` when only some of the child's current IPs should be fully reopened.
  - Intended use: web/native firewall clients can now reverse a strong live block only for selected child IP rows without wiping unrelated child-IP rule state for the same child.


## Change sync (2026-04-24)

- **Firewall live child-control endpoints added for Tools admin/mobile clients** – Tools now exposes a first `/api/firewall/*` surface for child-centric live firewall control.
  - Current auth note: the first implementation is intended for authenticated Tools operators with the `firewall` permission (`web` + `auth:web` + permission middleware), so non-web/mobile token auth for this area is still a later contract step.
  - Child endpoints: `GET /api/firewall/children`, `POST /api/firewall/children`, `PUT /api/firewall/children/{child}`, `GET /api/firewall/children/{child}/ip-addresses`, `POST|PUT|DELETE /api/firewall/children/{child}/ip-addresses/*`, quick toggles for child IP active state, plus quick `POST /api/firewall/children/{child}/block` and `POST /api/firewall/children/{child}/unblock`.
  - Additive child-centric selective-block endpoint: `PUT /api/firewall/children/{child}/host-block-lists` now accepts `host_block_list_ids[]` plus optional `action` (`drop|reject`) so clients can save one child's selected blocked host lists from a listbox/multi-select UI instead of only manipulating generic rule rows.
  - Additive per-IP targeting guidance: quick block requests, child-centric selective-block saves, and live-rule create/update calls can now also carry `target_scope` (`all_child_ips|selected_child_ips`) plus `child_ip_address_ids[]` when only some of the child's current IPs should be affected.
  - Additive schedule-key guidance: child and child-IP payloads can now also expose stable `schedule_key` values so DB-backed recurring full off / full on schedules can target logical names like `max`, `max-main`, `max-laptop`, `emily`, or `emily-mobile` without hardcoding numeric database ids.
  - Response-shape guidance: `GET /api/firewall/children` can now include additive `selected_host_block_list_ids[]`, `selected_host_block_list_target_scope`, `selected_host_block_list_child_ip_address_ids[]`, and `has_mixed_selective_targets` for each child. `GET /api/firewall/live-child-rules` can now also expose additive `target_child_ip_address_ids[]`, `target_ip_addresses[]`, and `target_scope_summary`.
  - Host-list refresh guidance: hostname-based host block lists are now best-effort expanded into CIDR-style service ranges when registry/RDAP data exposes them, so clients should not assume one hostname only becomes one exact host IP row.
  - Host-list endpoints: `GET|POST /api/firewall/host-block-lists`, `PUT /api/firewall/host-block-lists/{list}`, `POST /api/firewall/host-block-lists/{list}/hosts`, `POST /api/firewall/host-block-lists/{list}/refresh`, and `GET /api/firewall/host-block-lists/{list}/addresses`.
  - Live-rule endpoints: `GET|POST /api/firewall/live-child-rules`, `PUT /api/firewall/live-child-rules/{rule}`, `POST /api/firewall/live-child-rules/{rule}/enable`, `POST /api/firewall/live-child-rules/{rule}/disable`, and `POST /api/firewall/live-child-rules/sync`.

- **DNSBL stats endpoint added for API query/add/remove counters** – Tools now exposes `GET /api/dnsbl/stats` for API-readable counters in the DNSBL area.
  - Response guidance: the payload now contains `stats.api_queries` for recorded `/api/dnsbl/*` traffic plus `stats.mutations` for logical DNSBL add/delete/update outcomes such as `success`, `dry_run`, `failed`, and delete `already_not_listed` no-op cases.
  - Behavior note: older DNSBL log/Slack/mail audit trails still exist for manual operator review, but they were not a stable API-readable counter source for POST add/delete activity. `GET /api/dnsbl/stats` is now the canonical counter surface going forward.

## Change sync (2026-04-22)

- **Android SocialGPT now treats instruction reuse as persistent composer state** – native clients should persist the latest `Your instruction` text locally and reuse it for future reply generations until the user edits it again.
  - Intended use: faster repeat replies with more stable writing behavior across sessions.

- **Android SocialGPT reply flow is suggestion-first with mood/modifier controls** – reply mode is now expected to request multiple candidate replies first, then let users refine a selected suggestion with a follow-up modify instruction and mood selector.
  - Suggested mobile mood values: `balanced`, `friendly`, `formal`, `firm`, `casual`.
  - Endpoint remains `POST /api/ai/socialgpt/respond`; this is a client workflow change with additive request shaping (`modifier`).

- **Android verify-fact flow now defaults to deep verification and in-app fact box rendering** – verify mode should render a dedicated fact-result box directly in the mobile UI instead of relying on separate console/debug views.
  - Request guidance: verify calls should default to stronger reasoning (`reasoning_effort=high`) and a deep-check instruction suitable for compact/mobile output.

- **Mobile special-case signaling should be explicit via SocialGPT client metadata** – Android callers should always send `client_name`, `client_version`, and `client_platform="android_app"` so Tools API can apply mobile-specific handling/format simplifications where needed.
  - Additive guidance: keep this metadata stable and present on every SocialGPT call (reply + verify + modify/refine follow-ups), because backend routing/guardrails may rely on it.

- **Responder-name capture is no longer part of the Android parity target** – Android SocialGPT should not require a responder-name field in its primary workflow since on-screen capture contexts do not reliably infer or need that value.

- **DNS zone cache endpoint now falls back to stale cached pages before AXFR-only mode** – `GET /api/dns/zones/{zone}/cache` can now return `source="from_database_stale"` with additive `zoneData`, pagination, cache age, and `display_signature` when an older cached page exists but the normal TTL has expired.
  - Intended use: browser/native DNS editors can still render the last known page immediately, then launch AXFR in the background instead of showing only a loading spinner.
  - Backward compatibility: this is additive; older clients that only understand `from_database` / `needs_axfr` can ignore the new source value if they are not implementing cache-first rendering.

- **DNSBL forum-bounce intake and engine settings endpoints added** – Tools now exposes `GET /api/dnsbl/engine-settings` plus `POST /api/dnsbl/forum/bounce` for `dnsbl-engine` forum-recipient bounce handling.
  - `GET /api/dnsbl/engine-settings` returns normalized runtime flags such as `forum_bounce_enabled`, `forum_bounce_group_id`, `forum_bounce_exempt_group_ids`, and additive `report_mails_enabled` together with additive DNSBL auth metadata.
  - `POST /api/dnsbl/forum/bounce` accepts parsed rejected recipient addresses from bounce / mailer-daemon mail and can match them against vBulletin users, add the configured bounced-email group as a **secondary** forum group, and report `summary`, `matched_users`, `updated_users`, `skipped_users`, `unmatched_emails`, and `settings` in the response.
  - Auth: active DNSBL tokens through `X-Dnsbl-Token` / `dnsbl_token`, active DNSBL provider keys (`provider=tornevall_dnsbl`), and active admin-owned Tools API keys via admin passthrough. Inactive tokens return `401`; ordinary non-DNSBL Tools tokens can return `403` with `reason="wrong_token_type"`.
  - Android note: this is primarily an admin/helper/runtime integration path rather than a normal end-user mobile flow, but it is now part of the `/api/dnsbl/*` contract.

- **SocialGPT structured provider errors are now normalized safely before fallback/error responses** – `POST /api/ai/socialgpt/respond` no longer crashes when upstream OpenAI/provider failures arrive as nested JSON/array error payloads.
  - Behavior note: Tools now converts those structured upstream errors into ordinary error text before fallback retry logic and before building the final API error response.
  - Response-shape note: the endpoint schema is unchanged; clients should still treat `error` as normal text.

- **Mail Support Assistant unmatched fallback is now strict and Tools-config-only** – `GET /api/mail-support-assistant/config` now treats mailbox `defaults.generic_no_match_ai_enabled` as the authoritative enable flag for unmatched-mail fallback.
  - Behavior note: environment-only toggles are no longer part of the contract for enabling this fallback; clients should only trust the mailbox checkbox value coming from Tools config.
  - Config note: mailbox `defaults.generic_no_match_if` / `defaults.generic_no_match_instruction` now describe the mailbox's own **last fallback** after any advanced ordered `defaults.generic_no_match_rules[]` rows have already been evaluated.
  - Handling note: when that strict unmatched fallback actually sends a reply, the standalone/runtime contract now finalizes the message by marking it seen so it is not handled again during unread polling.

- **DNS zone cache/AXFR responses now expose additive display-signature metadata for cache-first refresh flows** – `GET /api/dns/zones/{zone}/cache`, `GET /api/dns/zones/{zone}/axfr`, and paged `GET /api/dns/zones/{zone}` responses can now include additive `display_signature` metadata representing the currently visible record page + pagination state.
  - Intended use: browser/native DNS editors can render cached rows immediately, run AXFR in the background, and only redraw the visible table when the completed AXFR response changes the currently displayed page.
  - Backward compatibility: this field is additive only; older clients can ignore it.

## Change sync (2026-04-20)

- **SpamAssassin whitelist adds now restore the old bare-domain expansion behavior** – `POST /api/spamassassin/list/whitelist` now treats a bare domain such as `openai.com` as a legacy host-style whitelist add and stores both `*@openai.com` and `*@*.openai.com`.
  - Behavior note: explicit mailbox/wildcard entries such as `friend@example.com` or `*@trusted.com` still pass through unchanged.
  - Remove guidance: deleting either generated whitelist wildcard row now also removes its companion row for the same base domain, so those legacy pairs behave like one logical domain add/remove again.

- **DNSBL add/update writes now reject RFC1918 private IPv4 ranges** – `POST /api/dnsbl/records/add`, `POST /api/dnsbl/records/update`, and add/update items inside `POST /api/dnsbl/records/bulk` no longer allow publication of `10.0.0.0/8`, `172.16.0.0/12`, or `192.168.0.0/16` into DNSBL / FraudBL zones.
  - Failure guidance: those requests now return `422` with `reason="private_ipv4_not_allowed_in_dnsbl"` when the submitted IP falls inside those private RFC1918 ranges.
  - Safety note: Tools admin also has a hygiene purge for older leaked private reverse-owner rows, but clients should treat the API-side `422` as the authoritative prevention rule for future writes.

- **DNSBL DMARC intake now requires an active add-capable DNSBL token** – `POST /api/dnsbl/dmarc/report` no longer accepts anonymous/internal upload mode, admin web-session fallback, or ordinary Tools API keys.
  - Auth: active DNSBL tokens sent through `X-Dnsbl-Token` / `dnsbl_token` are accepted when they have effective add/write scope (`can_add=true`). Active DNSBL provider keys (`provider=tornevall_dnsbl`) are also accepted, and active admin-owned Tools API keys still work through the same token transport as admin passthrough.
  - Failure guidance: missing/invalid/inactive DNSBL token now returns `401`; active DNSBL token without add scope now returns `403` with `reason="insufficient_dnsbl_scope"`; ordinary non-DNSBL Tools token values can be rejected as `wrong_token_type`.
  - Helper-client guidance: retry-capable uploaders such as `dnsbl-engine` should keep the local DMARC mail/file when upload is denied instead of deleting it.
- **DNSBL DMARC parser now accepts wrapped RFC822 mail with nested ZIP attachments more reliably** – `POST /api/dnsbl/dmarc/report` now also extracts DMARC XML from forwarded/wrapped `message/rfc822` mails where the actual report is stored as a nested ZIP attachment.
  - Behavior note: this reduces false `422 invalid_dmarc_report` failures for real-world inbound mail wrappers from providers that send DMARC reports as attached `.eml` / nested MIME messages.
- **DNSBL DMARC intake is now duplicate-safe and can also normalize notice-style forensic reports** – `POST /api/dnsbl/dmarc/report` now treats same-payload re-uploads as idempotent even when identical payloads race each other into the same unique `payload_hash`, returning `duplicate=true` with the already stored report instead of surfacing a SQL duplicate-key failure.
  - Additive parsing behavior: the endpoint can now also accept notice-/forensic-style DMARC mails that summarize `Sender Domain`, `Sender IP Address`, `SPF Alignment`, `DKIM Alignment`, and `DMARC Results` plus copied headers when aggregate XML is absent.
  - Additive response metadata: `report` payloads can now also include `report_kind` such as `aggregate_xml` or `forensic_notice`.

## Change sync (2026-04-19)

- **DNSBL delist/write audits now accept additive caller/source metadata and can emit richer operator audit trails** – `POST /api/dnsbl/records/delete` and delete-items inside `POST /api/dnsbl/records/bulk` now also understand optional source-tracing fields such as `source_type`, `source_name`, `source_site_url`, and `source_page_url`.
  - Intended use: server-side helpers / site integrations can tell Tools which site/system initiated the delist so operator audit mail/Slack/log entries show where the request came from.
  - Backward compatibility: these fields are additive only and do not change the server-side authoritative DNSBL delist resolution from the submitted IP.

- **DNSBL now has a DMARC intake endpoint plus review queue** – `POST /api/dnsbl/dmarc/report` now accepts DMARC XML / gzip / ZIP payloads for site-owner/admin review.
  - Auth: active DNSBL tokens (`X-Dnsbl-Token` / `dnsbl_token`) whose effective add scope is enabled. Active DNSBL provider keys and active admin-owned Tools API keys are also accepted through the same transport.
  - Missing/invalid/inactive DNSBL token owners are rejected with `401`, and active tokens without add scope are rejected with `403`.
  - Intended use: server-side helpers such as `dnsbl-engine` can upload DMARC reports to Tools, where the site owner/admin reviews them in `/admin/dnsbl/dmarc` and can publish specific source IPs to DNSBL as `spam` (`16`) or `spam + fraud` (`84`).
  - Android note: this is not a normal end-user mobile flow, but it is still part of the current `/api/dnsbl/*` contract.

- **Mail Support Assistant relay/standalone replies now stamp an anti-loop marker header** – outgoing assistant replies now include `X-Tornevall-Mail-Assistant: sent`.
  - Intended use: standalone/support clients can skip replying to messages that already carry this marker and avoid assistant self-reply loops.

- **Mail Support Assistant mailbox defaults now include additive spam-score reply suppression threshold** – `GET /api/mail-support-assistant/config` can now also return `defaults.spam_score_reply_threshold` per mailbox.
  - Intended use: standalone/support clients can suppress otherwise replyable mail when SpamAssassin score is above this threshold and keep those messages unread for manual review.
  - Score source guidance: support clients should read score from normal SpamAssassin metadata and now also support `X-Spam-Score` when `X-Spam-Status` does not provide parseable `score=` metadata.

- **Mail Support Assistant unmatched fallback now supports add-row IF/instruction rules** – `GET /api/mail-support-assistant/config` can now also return additive `defaults.generic_no_match_rules[]` for each mailbox.
  - Row fields include `id`, `sort_order`, `is_active`, `if`, `instruction`, optional `footer`, optional `ai_model`, and optional `ai_reasoning_effort`.
  - Execution guidance: standalone/support clients should evaluate active rows in `sort_order` order and allow fall-through to later rows when earlier rows are rejected by strict AI triage.
  - Backward compatibility: legacy mailbox-level single fields (`defaults.generic_no_match_if`, `defaults.generic_no_match_instruction`, `defaults.generic_no_match_footer`) remain available and now mirror the first active row when row data exists.

## Change sync (2026-04-18)

- **Mail Support Assistant unmatched-mail AI now has a separate mailbox-level IF condition plus stricter high-certainty triage semantics** – `GET /api/mail-support-assistant/config` can now also return `defaults.generic_no_match_if` for each mailbox.
  - Intended use: standalone/support clients should treat `generic_no_match_if` as the allow-condition for otherwise unmatched mail, and `generic_no_match_instruction` as the reply-writing instruction only after that condition is clearly met.
  - Execution guidance: the current standalone/support flow is now expected to require a strict JSON decision from AI and only send a no-match reply when the model explicitly allows it with high certainty; invalid/uncertain/rejected outcomes should leave the mail untouched.

- **Mail Support Assistant config now includes additive AI budget visibility metadata** – `GET /api/mail-support-assistant/config` can now also return `user.ai_daily_budget` for the bearer-token owner.
  - Fields include `feature`, `default_model`, `max_output_tokens_default`, `cap`, `used`, `remaining`, `is_unlimited`, and `source`.
  - Intended use: standalone/support clients can inspect whether the current token owner still has enough AI budget left for Mail Support Assistant runs, because the assistant reuses the same SocialGPT-backed reply endpoint budget.

- **AI / Mail Support Assistant API throttling is now bearer-aware with a much higher ceiling plus effective admin bypass** – `POST /api/ai/socialgpt/respond`, `/api/social-media-tools/extension/*`, and `/api/mail-support-assistant/*` no longer rely on the earlier small fixed per-minute caps.
  - Normal user/token traffic now gets a much higher request budget keyed to the resolved caller instead of the old low generic route cap.
  - Admin-owned requests are effectively unthrottled at the API route layer so support/maintenance bursts do not trip the limiter.

- **Mail Support Assistant matched-rule AI config now includes additive reasoning + stronger override semantics** – `GET /api/mail-support-assistant/config` can now return rule reply `ai_reasoning_effort` and mailbox default `generic_no_match_ai_reasoning_effort`.
  - Matched-rule behavior: when a standalone/support client sees `reply.ai_enabled=true`, the intended precedence is now explicit — use that rule's `responder_name`, `persona_profile`, `custom_instruction`, `ai_model`, and additive `ai_reasoning_effort` as the authoritative per-reply AI overrides.
  - No-match behavior is unchanged in scope: mailbox `defaults.generic_no_match_*` values are still only for unmatched-mail fallback handling and should not be treated as the source of replies for matched rules.

- **DNSBL fraud publication now mirrors into the ordinary DNSBL zones again** – fraud-style adds/updates (`publication_type=fraud|fraudbl`, or payloads whose bitmask includes phishing/fraud flags) are no longer limited to `bl.fraudbl.org`.
  - Additive behavior: the backend can now publish the same fraud write into `dnsbl.tornevall.org`, `opm.tornevall.org`, and `bl.fraudbl.org` in one request.
  - Additive response metadata: add/update success payloads can now include `publication.publication_types` to show which publication families were expanded for that write.
  - Commerce behavior is unchanged: commerce/ecommerce writes still stay in `bl.fraudbl.org` + `ecom.fraudbl.org` and are not mirrored into the ordinary DNSBL zones.

- **DNSBL bulk writes now harden interrupted DNS socket receives** – large `POST /api/dnsbl/records/bulk` requests now get a longer server-side runtime budget, and retryable low-level UDP receive interruptions such as `socket_recvfrom(): Interrupted system call` are retried before the write is finally treated as failed.
  - Response schema is unchanged; this is an execution-stability update for clients that submit larger bulk DNSBL batches.

- **DNSBL delete guardrails are now user-enforceable** – `POST /api/dnsbl/records/delete` and delete-items in `POST /api/dnsbl/records/bulk` can now be blocked by admin-managed user-level limits configured in Tools admin (`/admin/dnsbl/tokens`).
  - Guardrail fields: `delete_min_cidr_prefix`, `delete_limit_per_day`, `delete_cidr_limit`, `delete_throttle_limit`, `delete_throttle_window_seconds`.
  - New denial reasons: `delete_cidr_not_allowed` (`422`), `delete_cidr_prefix_too_broad` (`422`), `delete_daily_limit_exceeded` (`429`), `delete_throttle_exceeded` (`429`), `delete_cidr_limit_exceeded` (`422`).
  - Client guidance: inspect `reason` and additive `guardrails`/`usage` payload data before retrying or prompting users.

- **DNSBL token/auth metadata now includes additive delete guardrail info** – `GET /api/dnsbl/token/info` and the additive `token` auth-context metadata from `POST /api/dnsbl/check-ip` can now include `delete_guardrails` so clients can show effective delist limits before sending delete calls.
  - Additive `can_cidr_delete` can now also appear in those token/auth payloads so clients can hide CIDR-delist UI until delegated CIDR access is actually enabled.

- **Mail Support Assistant reply relay endpoint added** – `POST /api/mail-support-assistant/send-reply` can now relay one outgoing support reply via Tools-hosted mail transport for standalone clients that cannot rely on local `mail()`/MTA.
  - Auth model: dedicated personal non-global token with provider `provider_mail_support_assistant_mailer`.
  - Permission model: token owner must have `mail-support-assistant.relay` (admin bypass applies).
  - Request fields include `to`, optional `cc[]`/`bcc[]`, `from`, `subject`, plain-text `body`, additive optional `body_html`, and optional tracing metadata (`mailbox_id`, `rule_id`, `mode`, `message_meta`).
  - Relay behavior: when `body_html` is supplied, Tools relays the message as `multipart/alternative` so clients keep the text fallback while HTML-capable mail readers see the formatted reply.
  - Failure modes: `401` (invalid relay token), `403` (missing relay permission), `422` (payload validation).

- **Mail Support Assistant config now includes additive mailbox-level generic no-match reply defaults** – `GET /api/mail-support-assistant/config` can now return mailbox `defaults.generic_no_match_ai_enabled`, `defaults.generic_no_match_ai_model`, `defaults.generic_no_match_if`, `defaults.generic_no_match_instruction`, and `defaults.generic_no_match_footer`.
  - Additive expansion: mailbox defaults can now also include `defaults.generic_no_match_ai_reasoning_effort`, and rule replies can now include additive `reply.ai_reasoning_effort`.
  - Additive expansion: mailbox defaults can now also include `defaults.ignored_senders[]` (`id`, `email`, `label`, `notes`) so standalone/support clients can skip recurring sender emails before they become new follow-up cases again.
  - Intended use: standalone/support clients can optionally evaluate otherwise unmatched inbound mail against one admin-managed mailbox-level allow-condition before deciding whether a generic AI-generated reply is even allowed.
  - Response change is additive only; existing mailbox/rule schema remains valid.

## Change sync (2026-04-17)

- **SocialGPT fallback reasoning metadata behavior tightened** – `POST /api/ai/socialgpt/respond` now treats `gpt-4o*` as reasoning-capable in the same prefix family handling as other reasoning models.
  - When a fallback lands on `gpt-4o` / `gpt-4o-mini`, Tools can now keep forwarding `reasoning_effort` (when present/allowed) instead of dropping it purely by prefix mismatch.
  - Response schema is unchanged; this is an execution-behavior update for clients that set `reasoning_effort`.

- **SocialGPT request overrides expanded** – `POST /api/ai/socialgpt/respond` now also accepts optional `persona_profile_override` and `custom_instruction_override` alongside the existing `responder_name_override`.
  - Intended use: system-specific clients can temporarily override responder/persona/instruction behavior for one request without having to rewrite the token owner's saved SocialGPT settings.
  - Response schema is unchanged.

- **AI endpoints now accept personal AI-capable tokens beyond the legacy `tools_ai_bearer` provider** – `POST /api/ai/socialgpt/respond` and the `/api/social-media-tools/extension/*` token-backed endpoints no longer require the token record's provider to be exactly `tools_ai_bearer`.
  - Personal non-global API keys can now also authenticate when they are active and flagged as AI-capable in Tools (`api_keys.is_ai=1`).
  - Legacy `tools_ai_bearer` tokens still work unchanged.
  - OpenAI execution rules are unchanged: non-admin token owners still need approved `provider_openai` access; admin bypass still applies.
  - Additive token metadata on extension validation/smoke-test responses can now reflect the real provider name (for example `provider_ircwatch`) and can include `token.is_ai=true` when applicable.

- **Mail Support Assistant config endpoint added** – `GET /api/mail-support-assistant/config` now lets a standalone IMAP/mail-support client fetch its admin-managed mailbox/rule config from Tools by bearer token instead of keeping a separate local database copy.
  - Auth matches the same personal AI-capable token resolver used by other AI client endpoints (`Authorization: Bearer`, `X-Api-Key`, or `apikey`).
  - The endpoint returns additive `user` and `token` metadata plus `mailboxes[]`, each with nested IMAP credentials/defaults and ordered `rules[]` describing match fields, reply behavior, AI settings, and post-handle actions.
  - `provider_openai` remains excluded from `is_ai`; it is the upstream provider secret used *towards* OpenAI, not a client token used *towards* Tools.

## Change sync (2026-04-15)

- **DNSBL delist resolution now happens on the Tools server from the submitted IP itself** – `POST /api/dnsbl/records/delete` and delete-items inside `POST /api/dnsbl/records/bulk` no longer rely on the client/plugin to decide which blacklist subzones should be deleted.
  - Tools now performs its own live DNS inspection for the IP and derives the exact listed owner names / affected zones from that inspection before building DNS `DELETE` operations.
  - Client guidance: treat `publication_type` / `bitmask` on delete as optional hints only. If you are deleting, the authoritative scope now comes from the backend's live lookup of the IP.
  - Helper-client guidance: when deleting **one IP**, send **one delete request for that IP**. Do not fan out `check-ip` / `delete_candidates` into multiple delete calls for the same IP unless you are intentionally deleting multiple different IP addresses.

- **Microsoft To Do status now exposes additive platform-app diagnostics** – `GET /api/microsoft-todo/status` still returns connection state and local mirror counts, but now also includes a non-secret `platform_app` object with host-configuration details.
  - Additive fields include `managed_via`, `env_managed`, `client_id_configured`, `client_secret_configured`, `tenant`, `redirect_uri`, `recommended_callback_url`, `default_scopes`, `missing_fields[]`, and `status_message`.
  - Client guidance: if `app_available=false`, inspect `platform_app` before telling the user to reconnect; the host may simply be missing Microsoft platform-app configuration.

## Change sync (2026-04-14)

- **DNSBL write/check auth diagnostics are now aligned with token-info semantics** – auth failures on `POST /api/dnsbl/check-ip` and `POST /api/dnsbl/records/*` now return more specific additive diagnostics when a supplied token matches a known non-DNSBL model.
  - New/clarified diagnostic reasons include `wrong_token_type` (recognized Tools token/provider, but not a DNSBL write token) and `inactive_admin_api_key` (admin-owned API key matched but inactive).
  - Existing unknown/revoked token behavior remains available through `invalid_dnsbl_token` style auth failures.
  - Client guidance: when write/check fails, inspect additive `reason` fields before prompting users to request new token access.

## Change sync (2026-04-10)

- **DNSBL live IP inspection endpoint added** – `POST /api/dnsbl/check-ip` is now available for token-backed/live inspection of one IP address before or alongside DNSBL delist tooling.
  - Auth: same DNSBL auth transport as the write endpoints (`X-Dnsbl-Token`, `dnsbl_token`, or privileged admin/session/API-key access).
  - Request body: `{ "ip": "1.2.3.4" }`.
  - Success response includes `ip`, additive `lookup` metadata (`listed`, `combined_bitmask`, `constants`, `statement`, `zones[]`, `delete_candidates[]`, `delete_candidate_count`) plus additive `token` auth-scope metadata (`auth_mode`, `has_token`, `can_add`, `can_delete`, `can_update`, `scope_label`, optional token/user identifiers depending on auth model).
  - Intended use: native/admin/helper clients can first show an immediate DNS answer, then use this endpoint to confirm which publication family (`dnsbl`, `fraudbl`, `commerce`) is actually delistable with the current auth context.
  - Operational note: DNSBL write/check endpoints now emit explicit backend logs and can be forwarded to configured audit/notification channels, but this does not change the API response contract.

## Change sync (2026-04-13)

- **SocialGPT Chrome is now the Android reference implementation baseline** – use `K:/Apps/wamp64/www/tornevall.com/tools.tornevall.com/projects/socialgpt-chrome` as the canonical behavior/UI/settings source when planning the native Android SocialGPT surfaces.
  - This workspace update is **documentation and planning only** for Android parity.
  - Do **not** start Android implementation/integration from this PHPStorm session; actual app coding is intended to happen in Android Studio.
  - Before any Android coding, read `docs/android-socialgpt-reference.md` in this repo and keep it synced with relevant SocialGPT Chrome changes.

- **SocialGPT request metadata + disclosure guardrails updated** – `POST /api/ai/socialgpt/respond` now accepts additive client metadata fields so Tools can identify the calling build:
  - Request: optional `client_name`, `client_version`, `client_platform`.
  - Success and error responses can now include additive `client` metadata echoing the accepted values.
  - Tools-side guardrails now allow the AI to disclose the current model identifier and client version **only when the user explicitly asks for version/model info**.
  - Tools-side guardrails now refuse requests for hidden prompts, source code, `.env` values, passwords, tokens, API keys, and similar internals; matching incidents may be reported to configured support email recipients.

- **DNS cached-zone search null-byte hardening** – `/api/dns/zones/{zone}/search` now strips null bytes/control characters from incoming search strings before IP parsing. No response contract change; this fixes editor-side search errors on malformed pasted IP values.

- **SMS activity mail notifications added (operational only)** – successful inbound SMS storage and outbound SMS queueing now also trigger support email activity notifications. No public API request/response schema changes.

## Change sync (2026-04-05)

- **RSS editor auto-detection now also recognizes vBulletin external RSS links** – Tools now understands vBulletin-style feed endpoints such as relative `external?type=rss2...` / `external.php?type=RSS2...` values discovered from forum pages.
  - Behavioral guidance: this is an editor/add-feed detection improvement; it still stores the source as an ordinary `rss` feed and does **not** change the public `/api/rss/*` request/response schema.

- **RSS feed readers now expose resolved publishby names** – feed rows can now carry author information resolved from per-feed manual `publishby` mappings in Tools.
  - Intended for feeds where stored `content.publishby` is an ID-like or legacy raw value instead of a real person name.
  - `GET /api/rss/feed/{site}?as=json` feed-item rows now include additive author metadata:
    - `publishby` – resolved display name when available (falls back to the stored raw value)
    - `publishby_name` – resolved display name
    - `publishby_raw` – original stored value from `rss.content.publishby`
  - Atom output now also emits an entry author when a resolved name is known.
  - Mapping scope is per `urlid`, so the same raw value may resolve differently for different feeds without collisions.

- **RSS scraper URL idle hints added** – `GET /api/rss/urls` now returns additive `agent` and `idle` metadata for scraper-oriented clients.
  - Existing `urls[]` contract is unchanged; this is an additive response expansion.
  - New `idle` object appears especially when `always=0` and the current agent has no due URLs right now.
  - Fields: `idle.is_idle`, `idle.reason`, `idle.schedule_mode`, `idle.wait_seconds`, `idle.wait_minutes`, `idle.next_poll_at`, `idle.next_url` (`urlid`, `title`, `url`), `idle.scrapeable_total`.
  - Purpose: lets scraper clients back off intelligently and display/record how long until the next due fetch window.

- **Feed user questions – author attribution retrieval hardening (no API contract change)** – backend retrieval now applies a person-targeted first pass against `content.publishby` when the question explicitly asks about a named author (for example "articles X wrote").
  - If no rows match the author-filtered pass (for example legacy ID-like bylines), backend automatically falls back to broader keyword retrieval.
  - Response schema for `/feed/user-questions` is unchanged for Android clients; this is a quality improvement in answer evidence selection.

## Change sync (2026-04-06)

- **DNSBL token info endpoint now performs live inspection for any non-empty token string** – `GET /api/dnsbl/token/info` no longer rejects a supplied token only because it fails a local length/format check.
  - `401` is now reserved for missing/empty token input.
  - `404` still means no matching known token was found.
  - New diagnostic case: if the supplied value matches another Tools token/provider instead of a DNSBL write token, the endpoint now returns `422` with `reason="wrong_token_type"` plus additive token/user metadata describing what was matched.
  - Admin-owner passthrough: when that matched non-DNSBL token is an active admin-owned Tools token, the endpoint now returns success instead of `422` and reports `token.resolved_via="admin_api_key_passthrough"` with effective full DNSBL permissions (`is_admin_token=true`, `allow_add=true`, `allow_delete=true`, `can_add=true`, `can_delete=true`).
  - This helps native/admin helper clients distinguish "unknown token" from "valid token, but wrong auth model".

- **OpenAI-backed AI usage is now approval-first for non-admin users** – regular users must have real approved OpenAI access (`provider_openai`) before Tools will execute AI requests, even if a daily budget/default cap exists.
  - `POST /api/ai/url/analyze` already required this permission and is unchanged in schema.
  - `POST /api/ai/socialgpt/respond` now also requires the underlying JWT/web user or personal AI-token owner to have approved OpenAI access (admin bypass still applies).
  - `GET|POST /api/social-media-tools/extension/test` now likewise fails with `403` when the authenticated token owner lacks approved OpenAI access.
  - `GET /api/social-media-tools/extension/validate-token` remains a lightweight token-auth check only; it does not itself grant or prove OpenAI execution rights.

## Change sync (2026-04-04)

- **DNSBL token info endpoint added** – `GET /api/dnsbl/token/info` is now available. Pass the token via `X-Dnsbl-Token` header or `?dnsbl_token=<token>` query param. Returns permission info for any token status (active, pending, revoked). No session or API key fallback — only the token string is accepted.
  - Response includes: `token.name`, `token.status`, `token.is_admin_token`, `token.allow_add`, `token.allow_delete`, `token.can_add`, `token.can_delete`, `token.scope_label`, `token.zones` (array), `token.approved_at`, `token.requested_by_email`.
  - Error `401` if no token is supplied; `404` if not found.
  - Error `422` with `reason="wrong_token_type"` if the value matches another Tools token/provider instead of a DNSBL write token and that token is not eligible for admin passthrough. Diagnostic payload may include `token_type`, `provider`, `token` (`provider`, `name`, `is_active`, `is_global`, `is_personal`, `user_id`), `user` (`id`, `name`, `email`, optional `is_admin`, `is_acknowledged_admin`), and optional `admin_owner` diagnostics such as `automatic_dnsbl_access`, `accepted_for_dnsbl_reads_and_writes_via_token`, and `token_is_active`.
  - Rate limit: `throttle:300,1` (same as all DNSBL routes).
  - Useful for Android clients to validate a configured DNSBL token before attempting write operations.

- **DNSBL API token system for write access** – `POST /api/dnsbl/records/*` endpoints now support token-based authentication via `X-Dnsbl-Token` header or `dnsbl_token` body param. Users request tokens via web GUI (`/dnsbl/token/request`), admins approve, approved tokens are emailed one-time. Key behaviors:
  - **Scope enforcement**: `allow_add` (can list/upgrade IPs) and `allow_delete` (can delist/remove IPs) are independent boolean flags. Admin tokens (`is_admin_token=true`) bypass scope checks.
  - **Upgrade-only rule for non-admin adds**: New IP bitmask must be strictly greater (>) than the current DNS record value. Admin tokens and non-token auth bypass this check. Server performs live DNS lookup to verify current bitmask.
  - **Bulk endpoint**: `POST /api/dnsbl/records/bulk` accepts up to 200 operations (add/delete/update) in a single request. Each operation is validated and scoped independently; failures in one don't stop others.
  - **Rate limiting**: `throttle:300,1` (300 requests/minute) applies to all DNSBL routes.
  - **Zone scope**: DNSBL tokens have implicit permission for four known DNSBL zones: `dnsbl.tornevall.org`, `opm.tornevall.org`, `bl.fraudbl.org`, `ecom.fraudbl.org`.
  - **WordPress plugin integration**: The `tornevall-networks-dnsbl-implementation` WordPress plugin now uses this API via `Tornevall\Networks\DNSBL\ApiClient` and `Tornevall\Networks\DNSBL\WriteQueue` (bulk queue flushed at WordPress shutdown). Plugin stores token in option `tornevall_dnsbl_write_token`. Auto-report spam feature: when comment status transitions to spam and token is configured, IP is queued for add (bitmask 64).
  - **Dry-run acknowledgements on write endpoints**: `POST /api/dnsbl/records/add|delete|update|bulk` now accept optional `dry_run` (`true|1|yes|on`). When enabled, payload/scope/zone validation still runs, but DNS updates are not applied. Success responses include `dry_run: true` and `dry_run_accepted: true` so clients can confirm simulation mode was honored.
  - No request/response schema changes for Android if not using DNSBL write endpoints.

## Change sync (2026-04-05)

- **SocialGPT / extension token validation endpoint added** – `GET /api/social-media-tools/extension/validate-token` is now available for lightweight bearer-token verification without running the heavier `Tools → OpenAI` smoke test. Auth is the same personal AI-token model used by the other extension endpoints (`Authorization: Bearer`, `X-Api-Key`, `apikey`).
  - Success response includes: `ok`, `valid`, `message`, `user` (`id`, `name`, `email`), and `token` (`provider`, `user_id`, `is_personal`, additive `is_ai`, additive `access_scopes[]`).
  - Invalid/missing token returns `401` with `ok=false`, `valid=false`, `message="Bearer token rejected."`.
  - Intended for extension/native clients that want immediate token confirmation before loading settings or testing OpenAI.

## Change sync (2026-04-03)

- **SocialGPT Chrome extension – no Android API contract changes** – The SocialGPT Chrome extension received a Chrome Web Store compliance restructure (v1.2.12) that narrowed default browser permissions, added an optional global browser-wide AI mode, and added `CHROME_WEB_STORE_PRIVACY.md` to the extension source. There are **no changes** to the `/api/ai/socialgpt/respond`, `/api/social-media-tools/extension/*`, or any other Tools API endpoints. The extension-side architecture change is purely internal to the Chrome extension and the Chrome Web Store submission workflow. Android API contracts for these endpoints remain unchanged.

## Change sync (2026-03-31)

- **Feed user questions – version history context, JSON format, period fix** – site-focused questions (≤10 sites via `focus_site_ids[]`) now return structured JSON context with full period-independent version history. Key behavior changes:
  - Monthly period is now a 31-day rolling window (was 30).
  - `POST /feed/user-questions` with `focus_site_ids[]` containing ≤10 site IDs now activates JSON context mode; the AI receives a `version_history.articles` section with all stored versions of edited articles across ALL time (not limited by the selected period).
  - First site-focused question on a cold cache may take up to 30 seconds (version history aggregation); subsequent requests within 5 minutes return immediately from cache.
  - No request/response schema changes for Android — the endpoint contract is unchanged.

## Change sync (2026-03-30)

- **Whisper transcription queue added** – authorized users can submit media URLs to `/api/whisper/jobs` and monitor stage-based progress/status via `/api/whisper/status`, `/api/whisper/jobs`, and `/api/whisper/jobs/{jobId}`. Admin/manager users can trigger immediate queue processing through `POST /api/whisper/run-now`.


- **Microsoft To Do user integration added** – authenticated users now have a personal Microsoft To Do web UI at `/settings/integrations/microsoft-todo` plus authenticated API endpoints under `/api/microsoft-todo/*`.
- **Bidirectional sync model** – Tools now keeps a local mirror of Microsoft To Do lists/tasks and syncs both directions: local Tools changes are pushed to Microsoft To Do and remote Microsoft changes are pulled back into Tools.
- **Initial OAuth connect currently starts from web UI** – the Microsoft account connect flow begins from the signed-in web page (`POST /oauth/microsoft-todo/start` -> `/oauth/microsoft-todo/callback`). After connection, mobile/API clients can use the authenticated `/api/microsoft-todo/*` endpoints.

- **`GET /rss/urls` scraper scheduling is now agent-aware when `always=0`** – URL distribution now uses per-agent seen state keyed by `agent_id` (fallback `agent_name`) plus each URL's `readinterval`. This means one scraper's recent claims no longer block another scraper from receiving due URLs. Backend now stores per-agent URL claim windows and computes next allowed fetch per URL.
- **`GET /rss/urls?always=1` now returns full scrapeable set** – `always=1` bypasses interval filtering and returns all rows where `deleted=0` and `noscrape=0`.

- **Public `/feed` now has a client-side language switcher** – the page ships all UI phrase translations as a JSON blob (`window.feedPhrases`) and switches language on the fly based on browser `navigator.languages` preference (with `localStorage` persistence). Supported: `en`, `sv`, `da`, `no`, `fi`. No API change; this is pure browser-side i18n. If Android ever renders the public feed in a WebView, the switcher will work automatically. If Android builds a native feed view, use the same `config/feed_phrases.php` phrase keys for consistency.

- **`GET /rss/update` now aggressively purges handled unlocked inbound rows** – maintenance now deletes rows where `handled=1` and `processlock=0` during update runs (previous one-day handled retention removed), while still keeping locked/in-flight rows.
- **`GET /rss/update` stale-lock recovery is lock-age based** – release checks now use how long a row has been lock-claimed (not just how old the row is), which lowers the risk of unlocking older rows that are actively being processed.

- **DNS cache storage + sync behavior updated** – DNS zone cache now uses row-based storage (instead of one bulk serialized blob per zone) and record mutations (`/api/dns/records/add|delete|update|bulk`) now synchronize cache rows after successful confirmed master DNS updates, instead of default full-zone cache clear.
- **Per-zone cache invalidation policy added** – `dns_zone_settings` now supports `cache_invalidate_enabled` (default `false`), `cache_invalidate_interval_seconds` (default `259200`, i.e. every 3 days when enabled), and `last_invalidated_at`.
- **Feed user questions now support per-question focus selectors** – users can optionally focus the AI on specific categories or sites before asking. Request fields: `focus_categories[]` (array of category names) and `focus_site_ids[]` (array of urlids). Focus selections override global admin settings for that question only. Saved in question `meta_json.focus_categories` and `meta_json.focus_site_ids`.
- **`POST /rss/data` response now includes feed title per received row** – each `received[{urlid}]` item now includes `title` from `urls.title` in addition to `dataLength` and `url`, which helps worker logs and Google Alerts traceability.
- Coverage policy: this file is intended to describe all public Tools API endpoints under `/api/*` that Android integrations may consume, including auth and request/response behavior.
- Nethandle-web integration is planned, but no public `/api/nethandle/*` endpoints are published yet in current backend routes.
- RSS URL rows now expose selector-oriented fields used by clients: `publicSelector`, `hidden`, `feedUrl`, and `categoryFeedUrl`.
- `GET /rss/feed/{site}` accepts multiple selector styles in practice: numeric `urlid`, category slug, and hidden-feed `public_hash`.
- `GET /rss/feed/{site}` supports analytics selectors: `analytics-daily|weekly|monthly|yearly|bulk` plus aliases (`daily-analytics`, `weekly-analytics`, `monthly-analytics`, `yearly-analytics`, `bulk-analytics`).
- `GET /rss/update` now returns `subscriptionNotifications` counters (`processed`, `delivered`, `skipped`) after immediate targeted delivery attempts.
- `GET /rss/update` now keeps old unhandled inbound rows by default (safer backlog behavior); stale-unhandled purge is opt-in server-side.
- Subscription notification payloads now prioritize Tools entry permalinks first (`tools_entry_url` -> `/feed/entry/{contentId}`) and include source fallback (`original_url`).
- **Feed user questions** system now supports custom/optional response tone (empty = neutral default), multiple AI models (gpt-4o-mini/gpt-4o/o1-mini/o1/o3-mini) with automatic fallback from reasoning models, and "read more" expansion UI for recent questions on public feed view.
- **`GET /rss/update` now supports optional `urlid` targeting** – pass `urlid=<numeric urlid>` to process inbound rows only for that feed during this call (useful for isolated retries/testing). Response now includes `urlid_filter` for visibility.
- **Default `GET /rss/update` processing is fairer across feeds** – when no `urlid` is provided, inbound conversion uses per-url round-robin ordering so one problematic feed is less likely to block other feeds in the same run.

---

## 1) Base URL and environments

- **Dev**: `https://tools.tornevall.com/api`
- **Prod**: `https://tools.tornevall.net/api`

Android recommendations:
- Keep base URL environment-driven (BuildConfig/flavors).
- Use dedicated interceptors per auth type/endpoint group.
- This repo currently has no `productFlavors` or API host BuildConfig fields in `app/build.gradle.kts`; add those when dev/prod switching is implemented.

---

## 2) Authentication models (important)

This API uses multiple auth models in parallel:

1. **JWT auth (`auth:api`)**
   - Flow: `POST /account/login` returns `access_token`.
   - Use `Authorization: Bearer <jwt>` on protected JWT endpoints.

2. **Personal scoped bearer token (`api_keys` row with endpoint access scopes)**
   - Used by AI/social media extension endpoints and other personal bearer-token API flows.
   - Preferred model: one personal non-global token with the right `access_scopes[]` for the endpoint you want to call (for example `ai.client`, `ai.internal`, `whisper.api`, `mail-support-assistant.relay`).
   - Legacy compatibility: older `tools_ai_bearer` / `provider_socialgpt` rows and personal `is_ai=1` tokens still work where Tools maps them onto the same effective `ai.client` scope.
   - Token transport:
     - `Authorization: Bearer <token>`
     - `X-Api-Key: <token>`
     - `apikey=<token>` (body/query)

3. **Provider API keys**
   - Examples:
     - `provider_gsm` (SMS inbound webhook)
     - `provider_sms_mail` (SMS send/status)
     - DNS keys from `api_keys` table

4. **Web session (cookie auth)**
   - Several `/dns` and `/social-media-tools` endpoints accept session-based auth.

5. **Sanctum**
   - Some admin endpoints use `auth:sanctum` (for example `/sms/incoming`, weight tracking).

6. **Cron secret bearer**
   - `POST /rss/analytics/run` uses `Authorization: Bearer <ANALYTICS_CRON_SECRET>`.

---

## 3) Rate limits (from routes)

- `mcu`: `throttle:9000,1`
- `rss`: `throttle:9000,1`
- `ai`: named user-aware limiter with high per-minute ceiling; admin-owned requests are effectively unthrottled
- `sessions`: `throttle:300,1`
- `dns`, `dnsbl`: `throttle:300,1`
- `sms`: `throttle:300,1`
- `spamassassin`: `throttle:300,1` (`verify-email` has extra `10,1`)
- `weight-tracking`: `throttle:300,1`
- `social-media-tools*`: `throttle:120,1` overall, but `/social-media-tools/extension/*` now uses the same higher user-aware limiter as AI routes
- `google-home`: `throttle:120,1`
- `whisper`: `throttle:120,1`
- `mail-support-assistant`: named user-aware limiter with high per-minute ceiling; admin-owned requests are effectively unthrottled
- `rss/analytics/run`: `throttle:10,1`

---

## 4) Endpoint groups

### 4.1 Account/JWT (`/account`)

#### `POST /account/login`
- Auth: public
- Body:
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```
- 200 response:
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {"id": 1, "email": "user@example.com"}
}
```

#### `POST /account/register`
```json
{
  "name": "Test User",
  "email": "user@example.com",
  "password": "secret123",
  "password_confirmation": "secret123"
}
```
- Response: `201` when user is created.

#### `POST /account/logout`
- Auth: JWT
- Invalidates token.

#### `POST /account/refresh`
- Auth: JWT
- Returns a new token bundle.

#### `GET /account/user-profile`
- Auth: JWT
- Returns current user.

---

### 4.1.1 Google OAuth (web-only)

Google OAuth flows are **web-only** (browser redirect flows, not REST API endpoints). Android should use the standard JWT API endpoints (`POST /account/login`, `POST /account/register`) for authentication.

If Android later integrates Google Sign-In, the recommended approach is:
1. Perform Google Sign-In client-side to get an ID token.
2. Exchange that ID token at a dedicated backend endpoint (not yet exposed — future work).

Currently **no `/api/account/google/*` endpoint exists**. The web routes at `/auth/google` are for browser sessions only and are not suitable for Android.

---

### 4.2 MCU (`/mcu`)

Public read endpoints for MCU timeline:

- `GET /mcu/`
- `GET /mcu/timeline`
- `GET /mcu/timeline/category/{cid}`
- `GET /mcu/coming`, `/next`
- `GET /mcu/current`, `/last`, `/latest`
- `GET /mcu/phase/{phase}`
- `GET /mcu/collection/{collection}`
- `GET /mcu/categories`
- `GET /mcu/collections`
- `GET /mcu/find/{searchTerm}`
- `GET /mcu/imdb/{mcuId}`

Example:
```bash
curl -s "https://tools.tornevall.com/api/mcu/timeline" \
  -H "Accept: application/json"
```

---

### 4.3 RSS (`/rss`)

#### `GET /rss/`
- Returns overview with:
  - `urls[]`
  - `categories[]`
  - `availParams`
- `urls[]` entries now include selector/link metadata useful for Android clients:
  - `publicSelector`
  - `hidden`
  - `feedUrl`
  - `categoryFeedUrl`

#### `GET /rss/posting-queue/items`
- Auth: authenticated Tools web session + permission `rss.posting.handle`
- Intended caller: internal operator/browser-automation flows rather than public Android/news-reader clients
- Query params:
  - `queue=review|group|page|done`
  - `category=<category-slug>`
  - `feed_id=<numeric urlid>`
  - `per_page=<10..250>`
- Success response includes:
```json
{
  "ok": true,
  "filters": {
    "queue": "group",
    "feed_id": 0,
    "category": "politics",
    "per_page": 50,
    "page": 1
  },
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total": 12,
    "last_page": 1
  },
  "items": [
    {
      "contentid": 123,
      "urlid": 45,
      "title": "Example headline",
      "description": "Longer source description...",
      "excerpt": "Short queue-friendly excerpt...",
      "link": "https://example.com/post",
      "feed_title": "Example Feed",
      "feed_category": "Politics",
      "entry_url": "https://tools.tornevall.net/feed/entry/123",
      "queue_status": {
        "handle_group": true,
        "handle_page": false,
        "handled_group": false,
        "handled_page": false,
        "needs_group": true,
        "needs_page": false,
        "has_targets": true,
        "is_done": false
      }
    }
  ]
}
```

#### `PATCH /rss/posting-queue/items/{contentId}`
- Auth: authenticated Tools web session + permission `rss.posting.handle`
- Partial update for operator queue flags.
- Supported boolean fields:
  - `handle_group`
  - `handle_page`
  - `handled_group`
  - `handled_page`
- Optional request field:
  - `queue=review|group|page|done`
- Success response includes `contentid`, updated `queue_status`, and additive `should_remove=true|false` so current filtered UIs can remove a row immediately after it becomes fully handled.

#### `GET /rss/urls?scraper=1&limit=2&always=0`
- For scraper workers.
- **Required**: `scraper=1`, otherwise `403`.
- `always=0` behavior:
  - Returns a limited due-set for the calling scraper agent.
  - Due checks use `readinterval` + per-agent seen window (`agent_id` preferred, `agent_name` fallback).
  - One agent's claims do not suppress another agent's due-set.
  - Selected rows are still marked as recently requested (`lastscrape`, `lastrequestfrom`) for operational visibility.
- `always=1` behavior:
  - Returns all scrapeable URLs (`deleted=0`, `noscrape=0`) with no interval gating.
- Additive idle metadata:
  - Response now also includes `agent` metadata (`agent_id`, `agent_name`, `resolved_name`).
  - When the current worker has no due rows, `idle` reports how long until the next expected due URL (`wait_seconds`, `wait_minutes`, `next_poll_at`, `next_url`).
- Recommended scraper params:
  - `agent_id=<stable-hostname-or-worker-id>` (strongly recommended)
  - optional `limit=<n>` for `always=0` batch size control.

#### `POST /rss/data`
- Ingest scraper payload.
- Typical body:
```json
{
  "agent_id": "scraper-node-1",
  "content": {
    "12": "<xml-or-json-feed-content>",
    "34": "<xml-or-json-feed-content>"
  }
}
```
- Response includes `received`, `exceptions`, `agent`.
- `received[{urlid}]` entries include:
  - `dataLength`
  - `url`
  - `title` (from `urls.title`, useful for worker logs and Google Alerts visibility)

#### `GET /rss/update`
- Processes inbound data into content and returns stats.
- Optional query:
  - `urlid` (int) – if provided, only inbound rows for this `urlid` are handled in this request.
- Queue maintenance notes:
  - Handled rows are purged when unlocked (`handled=1`, `processlock=0`).
  - Stale lock release uses **lock age** semantics to avoid prematurely unlocking active/in-flight processing rows.
- Response includes `subscriptionNotifications`:
```json
{
  "urlid_filter": 27,
  "subscriptionNotifications": {
    "processed": 3,
    "delivered": 2,
    "skipped": 1
  }
}
```

#### `GET /rss/feed/` or `GET /rss/feed/{site}`
- Public feed output (Atom/RSS depending on implementation).
- JSON mode note: the controller also supports `?as=json`; when used, each returned row can include additive author fields `publishby`, `publishby_name`, and `publishby_raw`.
- Selector behavior for `{site}`:
  - numeric `urlid`
  - category slug
  - hidden-feed `public_hash` (direct access for hidden feeds)
  - analytics selectors:
    - `analytics-daily` / `daily-analytics`
    - `analytics-weekly` / `weekly-analytics`
    - `analytics-monthly` / `monthly-analytics`
    - `analytics-yearly` / `yearly-analytics`
    - `analytics-bulk` / `bulk-analytics`

Analytics selector note:
- The per-period selectors return bulk output for both category analytics and site analytics for the selected period.
- `analytics-bulk` combines all supported periods (`daily`, `weekly`, `monthly`, `yearly`).
- Item links in these analytics feeds prioritize per-target navigation where possible (category API feed link or site feed page).

Author note:
- When a source stores unfinished bylines like numeric IDs in `publishby`, Tools can now resolve them through per-feed manual mappings.
- In JSON mode, `publishby` is the display-ready value, while `publishby_raw` preserves the original stored value.
- Atom readers may see author metadata added on individual entries when a resolved name is available.

Examples:
```bash
curl -s "https://tools.tornevall.com/api/rss" -H "Accept: application/json"
```

```bash
curl -s -X POST "https://tools.tornevall.com/api/rss/data" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "android-debug-agent",
    "content": {
      "5": "<rss version=\"2.0\">...</rss>"
    }
  }'
```

---

### 4.3.1 RSS entry/permalink link behavior (notification context)

For subscription deliveries generated by backend notifier channels (mail/Slack/Discord), each item now uses this link priority:

1. `tools_entry_url` (direct Tools permalink: `/feed/entry/{contentId}`)
2. `original_url` (source-site fallback)

Android note:
- This is currently delivered by notification channels, not a dedicated Android endpoint.
- If Android later consumes the same digest payload model, preserve this order in UI/actions.

---

### 4.4 AI (`/ai`)

#### `POST /ai/url/analyze`
- Rate: `60/min`
- Auth: authenticated user + `provider_openai` permission (admin bypass)
- Body:
```json
{
  "url": "https://example.com/article",
  "question": "What is this page about?",
  "profile": "URL Analyzer"
}
```
- Error codes: `401`, `403`, `422`, `503`.

#### `POST /ai/socialgpt/respond`
- Auth: JWT/web user or personal bearer token with the effective scope `ai.client` (legacy `tools_ai_bearer` / `provider_socialgpt` rows and other personal `is_ai=1` keys still work because Tools maps them onto that same scope), plus approved OpenAI access for non-admin users (`provider_openai`). Admin bypass still applies.
- Throttling: now uses a resolved-caller/user-aware high ceiling instead of the older small fixed AI route cap; admin-owned requests are effectively unthrottled at the route layer.
- Typical body:
```json
{
  "context": "Original post...",
  "user_prompt": "Answer factually",
  "modifier": "short",
  "model": "gpt-4o",
  "reasoning_effort": "medium",
  "request_mode": "reply",
  "response_language": "sv",
  "client_name": "Tornevall Networks Social Media Tools",
  "client_version": "1.2.16",
  "client_platform": "chrome_extension"
}
```
- Response:
```json
{
  "ok": true,
  "model": "gpt-4o-mini",
  "response": "...",
  "usage": {"prompt_tokens": 42, "completion_tokens": 18},
  "used_fallback_model": true,
  "client": {
    "name": "Tornevall Networks Social Media Tools",
    "version": "1.2.16",
    "platform": "chrome_extension"
  }
}
```

Backend note: automatic fallback to `gpt-4o-mini` exists.
Additive note: callers can now also send optional `reasoning_effort` (`none|low|medium|high|xhigh`). For reply-mode calls using reasoning-capable models such as `gpt-5.4`, Tools may also apply reply reasoning internally even when the caller does not send that field.
If the authenticated non-admin user/token owner lacks approved OpenAI access, the endpoint returns `403`.
If a SocialGPT user explicitly asks which model/version is being used, the Tools-side prompt guardrails now allow disclosure of the current model identifier and client version only; requests for Tools internals, source code, hidden prompts, `.env` values, passwords, tokens, or API keys are refused.

#### `POST /ai/internal/respond`
- Auth: signed-in web/JWT user **or** personal bearer token with the scope `ai.internal`.
- Intended caller: internal Tools-side runtimes/automation such as Mail Support Assistant standalone or `dnsbl-engine`, not ordinary Android/social reply UX.
- Non-admin callers still require approved OpenAI access (`provider_openai`).
- Token-auth guidance: when bearer-token auth is used here, newer Tools builds now check the token scope `ai.internal` instead of requiring one exact provider name; the built-in generator still creates `provider_tools_openai` rows as a convenience label.
- Required request field:
```json
{
  "client_slug": "mail_support_assistant_standalone"
}
```
- Typical additive request fields mirror the direct AI task:
  - `context`
  - `user_prompt`
  - `modifier`
  - `mood` / `custom_mood`
  - `responder_name_override`
  - `persona_profile_override`
  - `custom_instruction_override`
  - `model`
  - `reasoning_effort`
  - `response_language`
  - `max_tokens`
  - `temperature`
  - `use_web_search`
  - `web_search_required`
- Success payload can now include `ok`, `request_id`, `model`, `response`, `usage`, additive `used_fallback_model`, additive `client` (`slug`, `name`, `description`), additive `applied_settings` (`responder_name`, `persona_profile_excerpt`, `custom_instruction_excerpt`, `mood`, `response_language`, `reasoning_effort`), and additive `web_search` metadata.
- Admin/config guidance: `/admin/openai` now also has a centralized **Internal AI clients** section where operators can configure the saved defaults for each `client_slug` (for example Mail Support Assistant and `dnsbl-engine`) separately from the SocialGPT settings UI.

Android SocialGPT guidance:
- Android should always send `client_name`, `client_version`, and `client_platform="android_app"` on reply, verify, and modify/refine follow-up calls.
- Android reply UX is suggestion-first: request candidate replies first, then let the user refine a selected suggestion with a modify box and mood/modifier selector.
- Android should persist the latest `Your instruction` value locally and keep reusing it until the user edits it again.
- Android verify mode should default to deeper verification intent from the start (`reasoning_effort=high`) and render the result in an in-app fact box instead of relying on console/debug output.

### 4.4.1 Mail Support Assistant (`/mail-support-assistant`)

#### `GET /mail-support-assistant/config`
- Auth: personal bearer token with the effective scope `ai.client` (legacy `tools_ai_bearer` and personal `is_ai=1` rows still work through that compatibility mapping)
- Intended caller: the standalone Mail Support Assistant client / cron worker
- Throttling: now uses a user-aware high ceiling rather than the old fixed `120/min` group cap; admin-owned requests are effectively unthrottled at the route layer.
- Success response includes:
```json
{
  "ok": true,
  "message": "Mail Support Assistant config loaded.",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "has_openai_access": true,
    "ai_daily_budget": {
      "feature": "social_media_extension",
      "default_model": "gpt-4o-mini",
      "max_output_tokens_default": 800,
      "cap": 60000,
      "used": 4200,
      "remaining": 55800,
      "is_unlimited": false,
      "source": "user_override"
    }
  },
  "token": {
    "provider": "provider_mail_support_assistant",
    "user_id": 1,
    "is_personal": true,
    "is_ai": true
  },
  "mailboxes": [
    {
      "id": 5,
      "name": "Main inbox",
      "imap": {
        "host": "imap.example.com",
        "port": 993,
        "encryption": "ssl",
        "username": "support@example.com",
        "password": "...",
        "folder": "INBOX"
      },
       "defaults": {
         "from_name": "Support Team",
         "from_email": "support@example.com",
         "bcc": "audit@example.com",
         "footer": "Kind regards",
         "run_limit": 20,
         "mark_seen_on_skip": false,
         "spam_score_reply_threshold": 6.5,
         "generic_no_match_ai_enabled": true,
         "generic_no_match_ai_model": "gpt-4o-mini",
         "generic_no_match_ai_reasoning_effort": "medium",
         "generic_no_match_if": "If the email is an unsolicited collaboration proposal, logo/design sales pitch, SEO offer, or similar unsolicited service sale, we should politely but firmly decline.",
         "generic_no_match_instruction": "Thank them briefly, decline politely but firmly, and keep the reply in the sender's original language.",
         "generic_no_match_footer": "Kind regards",
         "ignored_senders": [{
           "id": 77,
           "email": "ignoreme@example.com",
           "label": "Ignore Me <ignoreme@example.com>",
           "notes": "Recurring sender ignored by operators"
         }],
         "subject_trim_prefixes": ["[SPAMASSASSIN]", "[INFO]"]
       },
      "rules": [
        {
          "id": 11,
          "name": "Copyright notice autoreply",
          "match": {
            "from_contains": "p2p@copyright-notice.com",
            "to_contains": null,
            "subject_contains": "copyright notice",
            "body_contains": null
          },
          "reply": {
            "enabled": true,
            "ai_enabled": true,
            "subject_prefix": "Re:",
            "from_name": "Support Team",
            "from_email": "support@example.com",
            "bcc": "audit@example.com",
            "template_text": null,
            "footer_mode": "static",
            "footer_text": "Kind regards",
            "responder_name": "Thomas",
            "persona_profile": "Calm and factual",
            "mood": "firm",
            "custom_instruction": "Explain that the AS contact is wrong.",
            "ai_model": "gpt-4o-mini",
            "ai_reasoning_effort": "medium"
          },
           "post_handle": {
             "move_to_folder": "Handled",
             "delete_after_handle": false
           },
           "subject_trim_prefixes": ["[SPAMASSASSIN]"],
           "fallback_rule": {
             "enabled": false,
             "if_condition": null,
             "instruction": null,
             "ai_model": null,
             "ai_reasoning_effort": null
           }
         }
       ]
    }
  ]
}
```
- Error `401` when the supplied bearer token is missing or rejected.
- Matched-rule precedence note: when `reply.ai_enabled=true`, standalone/support clients should treat that rule's `responder_name`, `persona_profile`, `custom_instruction`, `ai_model`, and additive `ai_reasoning_effort` as the authoritative AI override set for that reply.
- Mailbox `defaults.generic_no_match_*` fields remain mailbox-level defaults for the unmatched-mail fallback path only.
- Unmatched-mail guidance: `defaults.generic_no_match_if` is the allow-condition, while `defaults.generic_no_match_instruction` is the reply-writing instruction only after the mail clearly matches that allow-condition.
- Ignore guidance: `defaults.ignored_senders[]` is a mailbox-level recurring-sender skip list; standalone/support clients can use those normalized emails to bypass future automatic handling and avoid creating new centralized follow-up cases for the same sender.
- Safety guidance: current standalone/support behavior is expected to leave the mail untouched unless AI returns a strict JSON allow decision with high certainty; uncertain or invalid no-match AI outputs should not be sent.
- Additive `user.ai_daily_budget` is visibility metadata only; it reports the effective AI daily budget used by the same SocialGPT-backed reply path that Mail Support Assistant calls, so clients can warn operators before a long mailbox run exhausts the remaining budget.

#### `GET /mail-support-assistant/cases`
- Auth: same personal AI-capable token model as `GET /mail-support-assistant/config`
- Intended caller: standalone/support operators that want the Tools-side stored/threaded conversation view
- Query params:
  - `limit` (optional, int, default 40, max 200)
  - `mailbox_id` (optional, int) to scope the returned cases to one mailbox
- Success response includes `ok`, `message`, and `cases[]` with additive threaded case metadata:
```json
{
  "ok": true,
  "message": "Mail Support Assistant cases loaded.",
  "cases": [
    {
      "id": 91,
      "mailbox_id": 5,
      "mailbox_name": "Main inbox",
      "reply_issue_id": "MSA-ABC12345",
      "thread_key": "subject:order status",
      "subject": "Re: [Ärende MSA-ABC12345] Order status",
      "status": "answered",
      "latest_reason": "rule_matched_replied",
      "latest_direction": "outbound",
      "latest_message_excerpt": "Thanks for your message...",
      "message_count": 3,
      "last_message_at": "2026-04-21T11:20:00+00:00",
      "admin_url": "https://tools.tornevall.net/admin/mail-support-assistant/cases/91",
      "public_url": "https://tools.tornevall.net/support/case/abcdef...",
      "recent_messages": [
        {
          "id": 501,
          "direction": "inbound",
          "message_key": "<abc@example.com>",
          "message_id": "<abc@example.com>",
          "reply_issue_id": "MSA-ABC12345",
          "subject": "Order status",
          "from": "customer@example.com",
          "to": "support@example.com",
          "sent_at": "2026-04-21T11:00:00+00:00",
          "status": "ignored",
          "reason": "rule_matched_reply_not_sent",
          "headers_raw": "From: customer@example.com\nSubject: Order status",
          "headers_json": {"from": "customer@example.com"},
          "body_text_raw": "Can you confirm my order status?",
          "body_text": "Can you confirm my order status?",
          "body_text_reply_aware": "Can you confirm my order status?",
          "body_html": "<p>Can you confirm my order status?</p>",
          "body_excerpt": "Can you confirm my order status?"
        }
      ]
    }
  ]
}
```
- Additive note: `recent_messages[]` can now also carry richer stored message content such as `headers_raw`, `headers_json`, `body_text_raw`, `body_text`, `body_text_reply_aware`, and `body_html` when the Tools-side case store has those fields.

#### `POST /mail-support-assistant/cases/sync`
- Auth: same personal AI-capable token model as `GET /mail-support-assistant/config`
- Intended caller: the standalone Mail Support Assistant client, which now pushes processed inbox snapshots back into Tools so operators/recipients can reopen one threaded case later
- Additive body/history note: the sync payload can now also carry full inbound/outbound body text/HTML plus source-instance metadata, so Tools admin can act as the centralized threaded history even when a cronjob on another server handled the mail.
- Typical body:
```json
{
  "mailbox_id": 5,
  "message_key": "<abc@example.com>",
  "message_id": "<abc@example.com>",
  "reply_message_id": "<reply@example.com>",
  "reply_issue_id": "MSA-ABC12345",
  "thread_key": "subject:order status",
  "in_reply_to": "<abc@example.com>",
  "references": ["<abc@example.com>"],
  "subject": "Order status",
  "subject_normalized": "Order status",
  "reply_subject": "Re: [Ärende MSA-ABC12345] Order status",
  "from": "customer@example.com",
  "to": "support@example.com",
  "date": "2026-04-21T11:00:00+00:00",
  "status": "handled",
  "reason": "rule_matched_replied",
  "body_text": "Can you confirm my order status?",
  "body_text_reply_aware": "Can you confirm my order status?",
  "body_html": "<p>Can you confirm my order status?</p>",
  "headers_raw": "From: customer@example.com\nSubject: Order status",
  "headers_map": {"from": "customer@example.com"},
  "body_excerpt": "Can you confirm my order status?",
  "reply_body_text": "Thanks for your message. We are checking your order.",
  "reply_body_html": "<p>Thanks for your message. We are checking your order.</p>",
  "reply_excerpt": "Thanks for your message. We are checking your order.",
  "selected_rule_id": 11,
  "selected_rule_name": "Order status autoreply",
  "meta": {
    "reply_transport": "tools_api",
    "source_instance": "server-a-cron",
    "source_host": "server-a",
    "source_runtime": "php_standalone"
  }
}
```
- Success response includes `ok`, `message`, and additive `case` metadata for the upserted threaded case, including `admin_url` and `public_url`.
- Additive sync note: callers can now also send `headers_raw`, `headers_map`, and `body_text_raw` so Tools can preserve remote-readable message headers plus raw/plain/HTML body variants for later operator inspection.

#### `POST /mail-support-assistant/send-reply`
- Auth: personal relay token with the scope `mail-support-assistant.relay`, not the generic AI receiver token.
- Permission: token owner must have `mail-support-assistant.relay` unless admin.
- Throttling: same higher user-aware Mail Support Assistant limiter as `GET /api/mail-support-assistant/config`; admin-owned requests are effectively unthrottled at the route layer.
- Typical body:
```json
{
  "mailbox_id": 5,
  "rule_id": 11,
  "mode": "fallback_after_php_mail",
  "to": "customer@example.com",
  "cc": [],
  "bcc": ["audit@example.com"],
  "from": "Support Team <support@example.com>",
  "subject": "Re: Order status",
  "body": "Thanks for your message.",
  "body_html": "<html><body><p>Thanks for your message.</p></body></html>",
  "message_meta": {
    "message_id": "<abc@example.com>",
    "uid": 12345
  }
}
```
- Success response includes `ok=true`, `message`, and additive `relay` metadata (`provider`, `user_id`, `mailbox_id`, `rule_id`, `mode`).
- Additive relay field: `body_html` is optional; when present, Tools sends both the plain-text `body` and the HTML part as a multipart reply.

---

### 4.5 Session stats (`/sessions`)

#### `GET /sessions/online/count`
```json
{"users": 3, "guests": 7, "bots": 2, "humans": 10, "total": 12, "minutes": 120}
```

---

### 4.6 DNS (`/dns`) - zones and records

Auth can be:
- web session
- API key (`Authorization: Bearer`, `X-API-Key`, or `api_key`)
- IP whitelist fallback

Zone endpoints:
- `GET /dns/zones`
- `GET /dns/zones/{zone}`
- `GET /dns/zones/{zone}/axfr`
- `GET /dns/zones/{zone}/cache`
- `GET /dns/zones/{zone}/search?q=...`
- `POST /dns/zones/{zone}/cache/clear`

Record endpoints:
- `POST /dns/records/add`
- `POST /dns/records/delete`
- `POST /dns/records/update`
- `POST /dns/records/bulk`

ACME helper endpoints:
- `POST /dns/acme/present`
- `POST /dns/acme/cleanup`
- `POST /dns/acme/cleanup-stale`

ACME helper behavior notes:
- These endpoints reuse the same auth and zone-permission model as the ordinary DNS writes.
- `present` expects `domain`, `challenge`, and optional `ttl` and writes one exact TXT row for `_acme-challenge.<domain>`.
- `cleanup` expects `domain` plus the exact `challenge` value and removes only that TXT row.
- `cleanup-stale` expects `domain` plus optional `keep_challenges[]`, additive `dry_run`, and additive `refresh_zone_cache` so older challenge TXT rows for the same owner can be removed in a controlled way.

Cache/invalidation behavior notes:
- Record mutations are now cache-row sync first (if zone cache exists), not automatic full-zone invalidation.
- `POST /dns/zones/{zone}/cache/clear` remains explicit/manual invalidation.
- Automatic policy invalidation is disabled by default per zone and only runs when explicitly enabled.
- Additive response note: `GET /dns/zones/{zone}`, `GET /dns/zones/{zone}/axfr`, and `GET /dns/zones/{zone}/cache` can now also include `display_signature`, a hash of the currently visible page records plus pagination metadata so cache-first clients can decide whether a finished AXFR actually requires a table redraw.
- Additive stale-cache note: `GET /dns/zones/{zone}/cache` can now also return `source="from_database_stale"` with the same visible-page payload when an expired cache page still exists locally, so clients can render stale rows immediately while AXFR refreshes in the background.
- Additive external-zone guidance: zone-list rows from `GET /dns/zones` can now also include `provider`, `provider_label`, `is_external`, `provider_zone_id`, and `provider_ready` when one zone is mapped to an external DNS provider instead of local BIND files.
- Current external-zone behavior: Cloudflare-backed zones stay visible in the same DNS editor/API, but live reads and writes are routed through the Cloudflare API instead of local file/AXFR logic. `GET /dns/zones/{zone}` can therefore return `method="CLOUDFLARE"`, while cached payloads can still return `method="CACHE"` together with additive `source_method="CLOUDFLARE"`.
- Refresh guidance: `GET /dns/zones/{zone}/axfr` remains the editor's refresh endpoint for compatibility, but for Cloudflare-backed zones it now performs a provider refresh rather than a real AXFR transfer.
- Bulk-write guardrail: `POST /dns/records/bulk` must not mix local zones and Cloudflare-mapped zones in one request; mixed batches now fail instead of partially falling back to local DNS writes.

Add record:
```json
{
  "domain": "test.example.com",
  "type": "A",
  "target": "192.168.1.10",
  "ttl": 300
}
```

Update record:
```json
{
  "domain": "test.example.com",
  "type": "A",
  "old_target": "192.168.1.10",
  "new_target": "192.168.1.11",
  "ttl": 300
}
```

Bulk:
```json
{
  "operations": [
    {
      "action": "ADD",
      "domain": "one.example.com",
      "type": "A",
      "target": "192.168.1.20",
      "ttl": 300
    },
    {
      "action": "DELETE",
      "domain": "two.example.com",
      "type": "A",
      "target": "192.168.1.21"
    }
  ]
}
```

DNSBL/FraudBL payload on same endpoints:
```json
{
  "ip": "203.0.113.4",
  "bitmask": 5,
  "publication_type": "fraudbl",
  "ttl": 3600
}
```

---

### 4.7 DNSBL (`/dnsbl`)

Token info endpoint (read-only, no auth fallback to session):
- `GET /dnsbl/token/info` – pass token via `X-Dnsbl-Token` header or `?dnsbl_token=` query param. Returns `token.name`, `token.status`, `token.is_admin_token`, `token.allow_add`, `token.allow_delete`, `token.can_add`, `token.can_delete`, additive `token.can_cidr_delete`, `token.scope_label`, `token.zones`, `token.approved_at`, and additive `token.delete_guardrails` (`delete_min_cidr_prefix`, `delete_limit_per_day`, `delete_cidr_limit`, `delete_throttle_limit`, `delete_throttle_window_seconds`). Works for any status (active/pending/revoked). `401` if no token is supplied, `404` if not found, and `422` with `reason="wrong_token_type"` when the value matches another Tools token/provider instead of a DNSBL write token. Active admin-owned Tools tokens now return success with those normal permission fields populated as full effective DNSBL access instead.

Stats endpoint:
- `GET /dnsbl/stats` – returns API-readable DNSBL counters for both endpoint traffic and logical write outcomes.
- Response includes `stats.api_queries` (`recorded_since`, total/successful/failed request counters, `by_endpoint`, and `other_dnsbl_requests`) plus `stats.mutations` (`recorded_since`, `additions`, `removals`, `updates`).
- Mutation counters are database-backed and grouped by logical action/outcome rather than only raw HTTP route hits, so bulk requests can still contribute one row per logical add/delete/update item.
- Auth model matches the normal DNSBL helper routes (`X-Dnsbl-Token` / `dnsbl_token`, DNSBL provider keys, or admin/session contexts already accepted by `/api/dnsbl/*`).

Live IP inspection endpoint:
- `POST /dnsbl/check-ip` – body `{ "ip": "1.2.3.4" }`. Returns live DNS-backed listing info for that IP plus additive delist-candidate data for the currently authenticated DNSBL token/session.
- Response includes `lookup.listed`, `lookup.combined_bitmask`, `lookup.constants[]`, `lookup.statement`, `lookup.zones[]` (per-zone live lookup rows), `lookup.delete_candidates[]` (`publication_type`, `bitmask`, `active_flags[]`, `zones[]`), and `lookup.delete_candidate_count`.
- Response also includes additive `token` auth-context metadata such as `auth_mode`, `has_token`, `can_add`, `can_delete`, `can_update`, additive `can_cidr_delete`, additive `delete_guardrails`, `scope_label`, and optional token/user identifiers depending on how the request was authenticated.

Engine settings endpoint:
- `GET /dnsbl/engine-settings` – returns normalized runtime settings currently used by `dnsbl-engine`.
- Typical response includes `settings.skip_delivery_status_notifications`, additive `settings.forum_bounce_enabled`, `settings.forum_bounce_group_id`, `settings.forum_bounce_exempt_group_ids[]`, plus additive `auth` metadata describing the resolved DNSBL auth context.

FORUM bounced-recipient intake endpoint:
- `POST /dnsbl/forum/bounce` – accepts bounce-/DSN-derived rejected recipient addresses for forum-account handling.
- Typical body:
```json
{
  "rejected_recipients": [
    {"email": "user@example.net"},
    {"email": "second@example.net"}
  ],
  "source_type": "dnsbl_engine_forum_bounce",
  "source_name": "dnsbl-engine",
  "original_filename": "1700000000.12345.mail",
  "subject": "Delivery Status Notification (Failure)",
  "sender_identity": "MAILER-DAEMON <mailer-daemon@example.net>",
  "remote_host": "mx.example.net",
  "diagnostic": "550 5.1.1 User unknown"
}
```
- Success response includes `ok`, `message`, `dry_run`, `summary` (`submitted_emails`, `matched_users`, `updated_users`, `skipped_users`, `already_grouped_users`, `exempt_users`, `unmatched_emails`, `dry_run`), `matched_users[]`, `updated_users[]`, `skipped_users[]`, `unmatched_emails[]`, additive `settings` (`enabled`, `target_group_id`, `exempt_group_ids[]`), additive `source`, and additive `auth` metadata.
- Auth model: active DNSBL tokens are accepted regardless of add/delete scope, active DNSBL provider keys are accepted, and active admin-owned Tools tokens can work through admin passthrough. Missing/invalid/inactive DNSBL token returns `401`; ordinary non-DNSBL Tools token values can return `403` with `reason="wrong_token_type"`.

DMARC admin intake endpoint:
- `POST /dnsbl/dmarc/report` – DMARC XML / gzip / MIME-wrapped report intake for the DNSBL review queue.
- Typical body:
```json
{
  "payload_base64": "H4sIAAAAA...",
  "source_type": "dnsbl_engine_dmarc",
  "source_name": "dnsbl-engine",
  "original_filename": "mailru-report.xml.gz",
  "content_type": "application/gzip",
  "content_encoding": "gzip"
}
```
- Success response includes `ok`, `duplicate`, `message`, normalized `report` metadata (`id`, `report_id`, `org_name`, `policy_domain`, `status`, `record_count`, `source_ip_count`, `date_begin`, `date_end`) plus additive `records[]` rows (`id`, `source_ip`, `message_count`, `disposition`, `dkim_result`, `spf_result`, `recommended_action`, `status`).
- Failure modes: `401` when the DNSBL token/provider key is missing/invalid/inactive, `403` when the resolved DNSBL auth context is active but lacks add scope (or the supplied value resolves to an ordinary non-DNSBL token type), `422` when the submitted payload cannot be parsed as a DMARC report.

Write endpoints (require DNSBL token or admin auth):
- `POST /dnsbl/records/add`
- `POST /dnsbl/records/delete`
- `POST /dnsbl/records/update`
- `POST /dnsbl/records/bulk` – accepts up to 200 operations; each must include `action` (`add|delete|update`), `ip`, `bitmask`, and optionally `publication_type`, `ttl`, `old_bitmask` (for update).

Fraud add/update publication note:
- Fraud-style add/update requests are now mirrorable across multiple blacklist families in one backend call.
- `publication_type=dnsbl` still targets the ordinary DNSBL zones (`dnsbl.tornevall.org`, `opm.tornevall.org`).
- `publication_type=fraud|fraudbl` can now result in writes to `dnsbl.tornevall.org`, `opm.tornevall.org`, and `bl.fraudbl.org` together.
- `publication_type=commerce|ecommerce|fraudcommerce` still targets `bl.fraudbl.org` plus `ecom.fraudbl.org` only.
- Additive write metadata can now include `publication.publication_types[]` alongside `publication.publication_type` and `publication.zones[]`.

Delete behavior note:
- For DNSBL delete operations, Tools now resolves the exact listed blacklist owners/subzones from the submitted IP on the server side before issuing DNS deletes.
- That means Android/native clients do not need to choose between `dnsbl.tornevall.org`, `opm.tornevall.org`, `bl.fraudbl.org`, or `ecom.fraudbl.org` themselves when delisting an IP.
- If the submitted IP is already not listed anywhere, Tools now returns an accepted no-op delete response instead of a hard `invalid_dnsbl_publication` failure. Those payloads can include additive `reason="already_not_listed"`, `already_not_listed=true`, `forced_success=true`, and `operation_count=0`.

Contract for write endpoints is the same as `/dns/records/*`. All write endpoints also accept optional `dry_run`.

Additive source/audit metadata note:
- DNSBL write/delete callers can now also send optional tracing fields such as `source_type`, `source_name`, `source_site_url`, and `source_page_url`.
- These fields are intended for operator audit visibility only (logs/mail/Slack) and do not change write/delete authorization or the authoritative delist scope.

CIDR delegation note:
- `delete_min_cidr_prefix` is the delegated IPv4 CIDR delete floor for non-admin token owners. Example: `25` means `/25`..`/32` are allowed, while `null` means CIDR delete is not delegated and clients should stay in single-IP mode.

---

### 4.8 SMS (`/sms`)

`routes/api.php` has two overlapping SMS groups. For Android, use the documented endpoints below.

#### `POST /sms/inbound`
- Public webhook + API key (`provider_gsm`).
- Token via `apikey` or `X-Api-Key`.
- Expected event: `sms:received`.

```json
{
  "event": "sms:received",
  "deviceId": "device-123",
  "id": "event-abc",
  "payload": {
    "messageId": "msg-1",
    "message": "hello",
    "phoneNumber": "+46700000000",
    "simNumber": 1,
    "receivedAt": "2026-03-21T10:45:00Z"
  }
}
```

#### `POST /sms/send`
- Auth: `provider_sms_mail` API key or web session.
- Body:
```json
{
  "destination": "+46700000000",
  "message": "Test from Android",
  "class": "-1",
  "central": ""
}
```
- 201 response:
```json
{
  "success": true,
  "pduid": 12345,
  "message": "SMS queued for sending"
}
```

#### `GET /sms/{pduid}/status`
- Auth: `provider_sms_mail` API key or admin session.

#### `GET /sms/incoming`
- Auth: `auth:sanctum`.

---

### 4.9 SpamAssassin (`/spamassassin`)

#### `POST /spamassassin/verify-email`
- Extra throttle: `10/min`.
- Body:
```json
{
  "email": "user@example.com",
  "username": "user@example.com",
  "password": "mailbox-password"
}
```

Preferences:
- `GET /spamassassin/preferences`
- `PUT /spamassassin/preferences/{preference}`

Example update:
```json
{
  "value": "5.0",
  "boolean": 0,
  "strict": 0,
  "description": "Required score"
}
```

Lists:
- `GET /spamassassin/list/{type}` where `{type}` = `blacklist|whitelist`
- `POST /spamassassin/list/{type}` with `{ "entry": "spam@example.com" }`
- `DELETE /spamassassin/list/{type}/{entry}`
- Whitelist behavior note: when `type=whitelist` and `entry` is a bare domain such as `openai.com`, Tools now stores both `*@openai.com` and `*@*.openai.com` to preserve the older SpamAssassin editor behavior. Blacklist adds are unchanged.
- Whitelist delete note: deleting either generated whitelist wildcard row for that same domain now removes both generated rows together.

---

### 4.10 Weight tracking (`/weight-tracking`)

Auth: `auth:sanctum`

- `GET /weight-tracking/persons`
- `GET /weight-tracking/persons/{person}/weights`
- `POST /weight-tracking/persons/{person}/weights`
- `DELETE /weight-tracking/persons/{person}/weights/{weight}`
- `GET /weight-tracking/diagram/{person}`

Create/update weight example:
```json
{
  "weight": 82.4,
  "date": "2026-03-21"
}
```

Response:
```json
{
  "success": true,
  "message": "Weight entry saved",
  "weight": {"id": 12, "weight": 82.4, "date": "2026-03-21"}
}
```

---

### 4.11 Social Media Tools

Catalog (`/social-media-tools`):
- `GET /social-media-tools/`
- `GET /social-media-tools/{tool}`
- Auth: web user with `social-media-tools.manage` or admin.

Facebook (`/social-media-tools/facebook`):
- `GET /outcome-config` (Bearer/API key via Tools resolver)
- `POST /ingest` (token required)

Single ingest:
```json
{
  "source_url": "https://facebook.com/some/page",
  "source_type": "page",
  "actor_name": "Admin",
  "action_text": "replied",
  "target_name": "User",
  "occurred_at": "2026-03-21T10:00:00Z"
}
```

Batch:
```json
{
  "entries": [
    {"source_url": "...", "action_text": "..."},
    {"source_url": "...", "action_text": "..."}
  ]
}
```

SoundCloud (`/social-media-tools/soundcloud`):
- `POST /ingest` (token required)
- Accepts single payload or `entries[]` batch.

Single payload:
```json
{
  "dataset_key": "tracks",
  "operation_name": "TopTracksByWindow",
  "source": {
    "external_id": "artist-123",
    "display_label": "Artist Name",
    "source_url": "https://soundcloud.com/artist"
  },
  "window_label": "last_7_days",
  "occurred_at": "2026-03-21T10:00:00Z",
  "rows": [
    {"label": "Track A", "metric_value": 1234, "url": "https://soundcloud.com/..."}
  ]
}
```

Extension (`/social-media-tools/extension`):
- `GET /validate-token`
- `GET /settings`
- `POST /facebook-participant-history`
- `GET /models?refresh=true`
- `PUT /settings`
- `GET /test`
- `POST /test`

Auth: personal bearer token with the effective scope `ai.client` (`Authorization: Bearer`, `X-Api-Key`, `apikey`). Legacy `tools_ai_bearer` rows and other active personal tokens marked `is_ai=1` still work through the same compatibility mapping.

OpenAI access note:
- `validate-token` is auth-only and can succeed even before the user is approved for OpenAI execution.
- `GET|POST /test` performs a live OpenAI call and now requires approved OpenAI access (`provider_openai`) for the token owner unless that user is admin.

`PUT /settings` example:
```json
{
  "responder_name": "Thomas",
  "persona_profile": "Factual and concise",
  "custom_instruction": "Avoid overstatements",
  "auto_detect_responder": true,
  "response_language": "sv",
  "facebook_admin_stats_enabled": true,
  "facebook_admin_debug_enabled": false
}
```

Typical `GET /settings` response shape:
```json
{
  "ok": true,
  "settings": {
    "responder_name": "Thomas",
    "persona_profile": "Factual and concise",
    "custom_instruction": "Avoid overstatements",
    "auto_detect_responder": true,
    "mood": "Neutral and formal",
    "custom_mood": "",
    "response_language": "sv",
    "verify_fact_language": "auto",
    "facebook_admin_stats_enabled": true,
    "facebook_admin_debug_enabled": false,
    "facebook_participant_scanner_enabled": false,
    "facebook_participant_group_context": "",
    "facebook_participant_group_contexts_by_group_id": {}
  },
  "available_models": ["gpt-5.4", "gpt-4o", "gpt-4o-mini"],
  "default_model": "gpt-4o-mini",
  "models_source": "provider",
  "models_warning": ""
}
```

Additive settings note:
- `GET /settings` and `PUT /settings` can now also carry `facebook_admin_stats_enabled=true|false`, which is the Tools-side on/off switch for the SocialGPT Facebook admin activity workflow. Browser/native clients should now treat it as a Tools-authoritative runtime flag, not as one setting that should still be editable from a local popup/config checkbox.
- `GET /settings` and `PUT /settings` can now also carry `facebook_admin_debug_enabled=true|false`, which is the Tools-side on/off switch for the extra SocialGPT Facebook admin debug diagnostics. Browser/native clients should fetch and obey this runtime flag from Tools instead of exposing a separate local debug checkbox for that Facebook workflow.
- `GET /settings` and `PUT /settings` can now also carry additive `facebook_participant_group_contexts_by_group_id`, keyed by Facebook `/groups/<id>` path segment. Android/mobile participant-analysis clients should treat this as the authoritative Tools-synced rules/context map for per-group participant-request moderation.

`POST /facebook-participant-history` guidance:
- Auth: same personal AI-capable bearer token model as the other extension endpoints.
- Request body:
```json
{
  "page_url": "https://www.facebook.com/groups/123456789/participant_requests",
  "group_id": "123456789",
  "period_days": 180,
  "candidates": [
    {
      "name": "Example Person",
      "profile_url": "https://www.facebook.com/groups/123456789/user/987654321/",
      "profile_user_id": "987654321"
    }
  ]
}
```
- Success payload can now include earlier approvals as well as rejections for matching linked logged groups, with additive participant rows such as `matched`, `decision_count`, `approved_count`, `approved_membership_request_count`, `approved_pending_post_count`, `approved_regular_pending_post_count`, `approved_anonymous_pending_post_count`, `approved_other_count`, `first_seen_at`, `last_seen_at`, `first_approved_at`, `last_approved_at`, `latest_outcome`, plus the earlier rejection-focused fields.
- Android/mobile participant-analysis clients should call this endpoint when they can extract one or more candidate names/profile URLs/profile user ids from the currently visible Facebook participant-request surface, so the same moderation-history context used by the browser helper can be shown/injected on mobile too.

Android note:
- `responder_name` still exists in the backend settings contract for extension/web parity, but Android SocialGPT should not require a responder-name field in its primary workflow.
- The endpoint already exists and is the correct Android source of truth for SocialGPT persona/settings sync; Android should not guess these values locally when a valid Tools bearer token is available.
- Android should treat `settings.persona_profile` as the primary reusable SocialGPT persona/system prompt coming from Tools. `settings.custom_instruction` is additive/fallback metadata and should only become the reusable composer instruction when `persona_profile` is empty.
- Recommended Android sync order for the reusable composer prompt is: explicit local in-progress prompt override → last Tools-synced reusable instruction → `settings.persona_profile` → `settings.custom_instruction` → app default prompt.
- Recommended Android refresh points: when the token is validated, when the Settings screen loads/syncs, and when the SocialGPT composer screen resumes. When Tools sends a new persona, Android should only overwrite the locally saved reusable prompt if the current local value still matches the previously synced Tools value or is blank.
- Recommended Android local-field mapping from `GET /settings`:
  - `settings.persona_profile` → reusable SocialGPT composer instruction / persona cache
  - `settings.custom_instruction` → additive fallback only when `persona_profile` is blank
  - `settings.response_language` → default reply language
  - `settings.verify_fact_language` → default verify/fact-check language
  - `available_models[]` / `default_model` → reply/verify model pickers when the Android UI wants to mirror Tools model availability

---

### 4.12 RSS analytics trigger (`/rss/analytics/run`)

#### `POST /rss/analytics/run`
- Auth: `Authorization: Bearer <ANALYTICS_CRON_SECRET>`
- Body (all optional):
```json
{
  "period": "daily",
  "categories": "all",
  "sites": false,
  "model": "gpt-4o-mini",
  "user_id": 1,
  "max_tokens": 1400,
  "dry_run": false
}
```

`period` accepted values:
- `daily`, `weekly`, `monthly`, `yearly`, `all`

Response:
```json
{
  "ok": true,
  "dry_run": false,
  "periods": ["weekly"],
  "languages": ["en", "sv"],
  "stats": {
    "categories_ok": 5,
    "categories_err": 0,
    "sites_ok": 0,
    "sites_err": 0
  },
  "log": [
    {"type": "category", "category": "Politics", "period": "weekly", "status": "ok"}
  ]
}
```

---

### 4.13 Utility/dev endpoints

- `GET /test`
- `GET /test/owneronly`
- `GET /internal`
- `GET /slack`
- `GET /slack/sendmessage/{message}`
- `GET /urltest`
- `ANY /urltest/isavailable`
- `GET /` returns `404 Not found`

These are usually not part of Android production flows.

---

### 4.14 IRC log

`/irclog` exists as a route group placeholder in current `routes/api.php`.
No concrete API endpoints are exposed there right now.

---

### 4.15 Google Home (`/google-home`)

Auth model:
- Session-based authenticated user (`web` middleware) with permission check (`google-home.use`) in controller.
- Admin users are allowed.

Endpoints:
- `POST /google-home/request`
- `POST /google-home/devices/query`
- `POST /google-home/devices/request-sync`
- `POST /google-home/push/tokens/register`
- `GET /google-home/push/tokens`
- `DELETE /google-home/push/tokens/{tokenId}`
- `POST /google-home/push/test`

`POST /google-home/request` body:
```json
{
  "endpoint": "v1/devices:query",
  "payload": {
    "agentUserId": "demo-user",
    "inputs": []
  }
}
```

`POST /google-home/devices/query` body:
```json
{
  "agentUserId": "demo-user",
  "inputs": []
}
```

`POST /google-home/devices/request-sync` body:
```json
{
  "agentUserId": "demo-user",
  "async": true
}
```

Response envelope:
```json
{
  "ok": true,
  "status": 200,
  "endpoint": "v1/devices:query",
  "data": {},
  "push": {
    "attempted": 1,
    "delivered": 1,
    "ok": true,
    "error": ""
  }
}
```

Push token register body:
```json
{
  "token": "fcm-device-token",
  "platform": "android",
  "device_label": "Pixel 9"
}
```

Push test body:
```json
{
  "title": "Tools Google Home",
  "body": "Push notifications are configured and working."
}
```

---

### 4.16 Microsoft To Do (`/microsoft-todo`)

Auth model:
- Signed-in web session (`web`) **or** JWT bearer token from `POST /account/login`
- These endpoints do **not** use Tools bearer tokens or Sanctum

Rate limit:
- `throttle:120,1`

Connection note:
- Web users can still start Microsoft connect from the web UI.
- Authenticated API/native clients can now also request a per-user Microsoft authorization URL from a dedicated `/api` helper and open it in a browser surface.
- The public callback URL can now still finish the original OAuth transaction even when the browser no longer has an active Tools web session, as long as the signed OAuth `state` still matches the original user/transaction.

#### `GET /microsoft-todo/oauth/start`
Returns one Microsoft authorization URL for the currently authenticated user.

Typical response:
```json
{
  "ok": true,
  "authorization_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...",
  "callback_url": "https://tools.tornevall.com/oauth/microsoft-todo/callback",
  "connect_web_url": "/settings/integrations/microsoft-todo"
}
```

#### `GET /microsoft-todo/status`
Returns connection state, availability of the platform Microsoft app, and local mirror counts.

Additive note:
- The response now also includes additive `connect_api_url` plus a `platform_app` object with non-secret host diagnostics for the shared Microsoft To Do platform app (`managed_via`, `env_managed`, `client_id_configured`, `client_secret_configured`, `tenant`, `redirect_uri`, `recommended_callback_url`, `default_scopes`, additive `account_support_hint`, additive `supports_personal_accounts`, `missing_fields[]`, `status_message`).

Example response:
```json
{
  "ok": true,
  "connected": true,
  "app_available": true,
  "connect_web_url": "/settings/integrations/microsoft-todo",
  "connect_api_url": "/api/microsoft-todo/oauth/start",
  "connection": {
    "status": "connected",
    "status_label": "Connected",
    "status_description": "Connected to Microsoft account \"user@example.com\".",
    "provider_account_name": "user@example.com",
    "expires_at": "2026-03-30T13:15:00+00:00",
    "last_connected_at": "2026-03-30T12:58:00+00:00"
  },
  "counts": {
    "lists": 4,
    "tasks": 22,
    "dirty_lists": 0,
    "dirty_tasks": 1
  }
}
```

#### `POST /microsoft-todo/sync`
Runs an immediate bidirectional sync.

Example response:
```json
{
  "ok": true,
  "message": "Microsoft To Do sync complete.",
  "sync": {
    "ok": true,
    "lists_pushed": 1,
    "tasks_pushed": 2,
    "lists_pulled": 4,
    "tasks_pulled": 22,
    "errors": []
  }
}
```

#### `GET /microsoft-todo/lists?include_tasks=1`
Returns the locally mirrored Microsoft To Do lists.
- `include_tasks=1` (default) includes nested tasks
- `include_tasks=0` returns only list metadata

#### `POST /microsoft-todo/lists`
Create a list and sync it to Microsoft To Do.

Request body:
```json
{
  "display_name": "Work"
}
```

#### `PATCH /microsoft-todo/lists/{listId}`
Rename a synced list.

Request body:
```json
{
  "display_name": "Work Projects"
}
```

#### `DELETE /microsoft-todo/lists/{listId}`
Delete the list both locally and in Microsoft To Do.

#### `GET /microsoft-todo/lists/{listId}/tasks`
Returns tasks for one local mirrored list.

#### `POST /microsoft-todo/lists/{listId}/tasks`
Create a task in the given list.

Request body:
```json
{
  "title": "Follow up with customer",
  "body_text": "Remember to attach the report.",
  "importance": "high",
  "status": "notStarted",
  "due_at": "2026-04-02 09:00:00",
  "reminder_at": "2026-04-02 08:30:00"
}
```

#### `PATCH /microsoft-todo/tasks/{taskId}`
Update a task.

Allowed fields:
- `title`
- `body_text`
- `importance` (`low|normal|high`)
- `status` (`notStarted|inProgress|completed|waitingOnOthers|deferred`)
- `due_at`
- `reminder_at`

#### `DELETE /microsoft-todo/tasks/{taskId}`
Delete the task both locally and in Microsoft To Do.

Android recommendation:
- Treat Tools as the primary app-facing backend.
- The backend already performs push-then-pull sync; Android should not call Microsoft Graph directly for this feature.
- If the user is not yet connected, prefer `GET /api/microsoft-todo/oauth/start` and then open the returned Microsoft authorization URL in a Custom Tab/WebView/browser surface.
- If the user wants to use personal Microsoft accounts, tenant/account-type guidance from `platform_app.account_support_hint` should be surfaced before connect so `unauthorized_client` misconfiguration is easier to spot.

---

### 4.17 Whisper (`/whisper`)

Auth model:
- Signed-in web session (`web`) **or** JWT bearer token from `POST /account/login`
- Requires permission `whisper.use` (admin users bypass)

Dedicated token-auth transcription note:
- Tools now also has a separate `/api/whisper/transcribe/*` surface for server-to-server callers that use a personal token with the scope `whisper.api` instead of web/JWT auth (the built-in generator still creates `provider_whisper_api` rows as a convenience label).
- That token API additionally requires user permission `whisper.api` (plus the ordinary `whisper.use` access; admin bypass still applies).

Rate limit:
- `throttle:120,1`

Overview:
- Queue-based transcription where users submit either media URLs or uploaded audio/video files and backend workers process jobs when capacity is available.
- Jobs expose stage status and `%` progress (`queued`, `downloading`, `transcribing`, `finalizing`, `completed`, `failed`).
- Users can see their own jobs; admins/managers can see all jobs and trigger run-now processing.
- Jobs can now also expose additive `queue_channel` / `queue_channel_label` so signed-in clients can tell whether one row came from the ordinary web/JWT queue or the newer token-authenticated API queue.

#### `GET /whisper/status`
Returns queue counters and capability flags.

Additive status note:

- `config.ytdlp_configured` can now appear as `true|false` so clients can tell whether the current host is expected to resolve YouTube-style page URLs through yt-dlp.

Example response:
```json
{
  "ok": true,
  "summary": {
    "queued": 3,
    "processing": 1,
    "completed": 21,
    "failed": 2
  },
  "can_manage_all": false,
  "config": {
    "enabled": true,
    "default_model": "turbo",
    "upload_max_mb": 64,
    "upload_limit": {
      "configured_mb": 200,
      "php_upload_max_mb": 64,
      "php_post_max_mb": 128,
      "effective_max_mb": 64,
      "effective_max_label": "64 MB",
      "limited_by_php": true
    },
    "ytdlp_configured": true
  }
}
```

Additive upload-limit guidance:
- `config.upload_max_mb` now reflects the practical/effective Whisper upload cap for the current host.
- Additive `config.upload_limit` can explain when PHP upload/body limits are lower than Whisper's own configured limit.

#### `GET /whisper/jobs?limit=100`
Returns visible queue jobs for the current user.

#### `POST /whisper/jobs`
Queues a new transcription job.

URL-mode guidance:

- `source_url` may still be a direct audio/video URL.
- `source_url` may now also be a supported page/video URL such as YouTube; those rows are downloaded/extracted through yt-dlp before Whisper starts.
- Uploaded-file jobs are unchanged and never go through yt-dlp.

URL request body:
```json
{
  "source_url": "https://example.com/audio.mp3",
  "model": "small",
  "language": "sv"
}
```

Multipart upload request:

Use `multipart/form-data` with:

- `media_file` (uploaded audio/video file)
- optional `model`
- optional `language`

Important rule:

- send **either** `source_url` **or** `media_file`, not both.

Upload error guidance:
- When one uploaded media file is too large for the host, only partially uploaded, or blocked by PHP temporary-upload failures, the endpoint can now return `422` with `errors.media_file[]` carrying a direct human-readable explanation instead of only the generic `The media file failed to upload.` validation wording.

#### `GET /whisper/jobs/{jobId}`
Returns one visible job item.

Additive job fields:

- `source_type` = `url|upload`
- `source_label` = readable URL/filename label
- `source_mime` = MIME type when known for uploaded files
- `source_size_bytes` = file size when known for uploaded files
- `liveness.state` = `inactive|active|quiet|suspect|stale`
- `liveness.summary` = readable runner-health explanation for the current job
- `liveness.heartbeat_at` = latest queue-runner heartbeat timestamp for the job
- `liveness.heartbeat_age_seconds` = how old that heartbeat is
- `liveness.last_output_at` = latest captured yt-dlp / Whisper output timestamp when available
- `liveness.last_output_age_seconds` = how old that last output line is when available
- `liveness.runner_id` = additive internal runner identifier for debugging
- `liveness.current_step` = additive normalized internal step label such as `claimed` or `transcribing_audio`
- `liveness.stale_after_seconds` = backend threshold after which the active row is considered stale
- `liveness.is_stale` = convenience boolean mirroring whether the backend currently considers the row stale
- `cancel_requested_at` = ISO timestamp when the user/operator has already requested cancellation for the active row
- `can_cancel_now` = `true|false` for whether the row is actively processing and may be cancelled safely
- `can_restart_now` = `true|false` for whether the row may be restarted immediately
- `can_reset_for_retry` = `true|false` for whether the row is specifically in a failed/exhausted state that can be reset back to queued
- `can_delete` = `true|false` for whether the row may be deleted right now (active processing rows expose `false`)
- `queue_channel` = `web|api`
- `queue_channel_label` = readable queue origin such as `Web queue` or `API queue`
- `callback` = additive callback-delivery metadata for token-submitted jobs (`url`, `status`, `http_status`, `last_attempt_at`, `delivered_at`, `error`)
- `share` = additive public transcript-share metadata when a share already exists (`url`, `token`, `created_at`, `last_accessed_at`, `access_count`)

#### `POST /whisper/jobs/{jobId}/cancel`
Requests cancellation of one visible active Whisper job.

Behavior guidance:

- ordinary users can cancel only their own visible jobs
- managers/admins can cancel any visible job they are allowed to see
- only actively processing rows (`downloading`, `transcribing`, `finalizing`) are cancellable this way
- cancellation is cooperative: the runner stops the active yt-dlp/Whisper child process when it notices the cancel request, then the row becomes restartable/deletable afterwards

#### `DELETE /whisper/jobs/{jobId}`
Deletes one visible Whisper job together with its stored project files.

Behavior guidance:

- ordinary users can delete only their own visible jobs
- managers/admins can delete any visible job
- jobs in `downloading`, `transcribing`, or `finalizing` state are rejected until they are no longer actively processing

#### `POST /whisper/jobs/{jobId}/restart`
Resets one visible failed/queued job and starts it again immediately.

#### `POST /whisper/run-now`
Manager/admin endpoint to trigger immediate queue processing.
- Requires permission `whisper.manage` (admin bypass).

Request body (optional):
```json
{
  "limit": 1,
  "reset_failed": true
}
```

#### Token-authenticated transcribe API (`/whisper/transcribe`)

Auth model:
- Dedicated active personal token with the scope `whisper.api`
- Preferred transport: `Authorization: Bearer YOUR_API_TOKEN`
- Legacy `X-Api-Key` / `apikey` transport may still work for backwards compatibility, but new integrations should prefer the Authorization header
- Token owner must also have permission `whisper.api` plus `whisper.use` (admin bypass still applies)

##### `GET /whisper/transcribe/status`
Returns queue counters for the token-authenticated API queue channel only.

##### `GET /whisper/transcribe/jobs?limit=100`
Returns visible Whisper jobs from the API queue channel for the token owner.

##### `GET /whisper/transcribe/jobs/{jobId}`
Returns one visible Whisper API-queue job for the token owner.

##### `POST /whisper/transcribe`
Queues a new token-authenticated Whisper transcription job.

Request guidance:
- Supports the same URL-vs-upload model as `POST /whisper/jobs`
- Requires additive `callback_url`
- Supports the same additive `source_label`, `source_note`, `model`, `language`, `analysis_language`, `translation_target_languages[]`, and `disable_diarization` fields as the normal queue endpoint

Upload error guidance:
- The token API now uses the same clearer `422 errors.media_file[]` validation path for oversize, partial, and PHP-level upload transport failures before the Whisper job is queued.

Example JSON body:
```json
{
  "source_url": "https://example.com/audio.mp3",
  "callback_url": "https://api.example.test/whisper/callback",
  "model": "large",
  "language": "sv",
  "analysis_language": "sv"
}
```

Example success response:
```json
{
  "ok": true,
  "message": "Whisper API job queued. A callback will be sent when the job reaches a terminal state.",
  "job": {
    "id": 123,
    "queue_channel": "api",
    "queue_channel_label": "API queue",
    "status": "queued",
    "callback": {
      "url": "https://api.example.test/whisper/callback",
      "status": "pending",
      "http_status": null,
      "last_attempt_at": null,
      "delivered_at": null,
      "error": null
    },
    "share": null
  }
}
```

Terminal callback guidance:
- When the job finishes as `completed` or `failed`, Tools now sends one JSON `POST` to the submitted `callback_url`
- The callback payload includes additive `event` (`whisper.job.completed|whisper.job.failed`) plus a nested `job` object with status/source/timing/transcript/analysis/translation/diarization data
- Successful completed API jobs now also include additive `job.share.url` pointing at the public transcript share page

---

## 5) Recommended Android structure

Retrofit interfaces:
- `AuthApi`
- `RssApi`
- `AiApi`
- `DnsApi`
- `SmsApi`
- `SocialMediaApi`
- `MicrosoftTodoApi`
- `WhisperApi`

Interceptors:
- `JwtAuthInterceptor` for authenticated `/account` usage after login
- `ToolsBearerInterceptor` for extension/ai/social ingest
- `ApiKeyInterceptor` for DNS/SMS webhook/provider keys

Minimum error mapping:
- `400` validation
- `401` unauthenticated
- `403` forbidden
- `422` business/validation errors
- `429` throttling
- `500/503` backend/provider errors

Current implementation in this repo:
- Single module: `:app` (see `settings.gradle.kts`)
- UI architecture: one activity + Navigation Component fragments
  - `app/src/main/java/net/tornevall/android/tools/MainActivity.kt`
  - `app/src/main/res/navigation/mobile_navigation.xml`
- Current fragments: `Transform`, `Reflow`, `Slideshow`, `Settings`, `SocialGpt`
- API calls are currently implemented with `HttpURLConnection` clients (`ToolsSocialGptClient`, `ToolsExtensionClient`)
- Retrofit/OkHttp API service layers are not implemented yet
- `INTERNET` permission is present in `app/src/main/AndroidManifest.xml`
- Responsiveness uses resource qualifiers (not runtime branching):
  - `layout/content_main.xml` -> `BottomNavigationView` (phones)
  - `layout-w600dp/activity_main.xml` + `layout-w600dp/content_main.xml` -> drawer/no bottom nav
  - `layout-w1240dp/content_main.xml` -> permanent left `NavigationView`
- `TransformFragment` switches list/grid via layout resources:
  - `layout/fragment_transform.xml` (`LinearLayoutManager`)
  - `layout-w600dp/fragment_transform.xml` (`GridLayoutManager`)

### 5.1) SocialGPT Android parity guardrails

- Canonical reference implementation for SocialGPT UX/runtime behavior:
  - `K:/Apps/wamp64/www/tornevall.com/tools.tornevall.com/projects/socialgpt-chrome`
- Android planning/reference document:
  - `docs/android-socialgpt-reference.md`
- Session/workflow constraint:
  - This PHPStorm workspace should be used for docs/spec updates only.
  - Perform Android implementation/integration in Android Studio.
- Parity rule:
  - When SocialGPT Chrome behavior, setting keys, or endpoint usage changes, update this file and `docs/android-socialgpt-reference.md` before Android feature coding starts.
- Android-specific parity expectations:
  - Remove responder-name from the primary Android SocialGPT UX because on-screen capture does not reliably provide it.
  - Use a styled native bubble/toolbox surface rather than extension-style browser overlays.
  - Include a direct `Verify fact` action in that bubble and render a dedicated fact-result box in-app.
  - Persist `Your instruction` locally and reuse it until changed.
  - Treat reply mode as suggestion-first, with follow-up refinement through a modify box and mood dropdown.
  - Always signal Android origin through stable SocialGPT client metadata so Tools API can simplify mobile-specific handling when needed.
  - Facebook `participant_requests` on Android must be treated as a screen-capture-first workflow, not as a browser-network/GraphQL workflow. Unless Android later gets privileged WebView/network hooks for that exact Facebook surface, do **not** assume that the same GraphQL payloads used by `projects/socialgpt-chrome/js/content-script.js` are available on-device.
  - The Android/mobile embryo for participant analysis must still reuse the same Tools-backed rule/history sources as browser SocialGPT:
    - `GET|PUT /api/social-media-tools/extension/settings` for `facebook_participant_group_contexts_by_group_id`
    - `POST /api/social-media-tools/extension/facebook-participant-history` for earlier approval/rejection context
  - Current mobile-view recognition markers (from the 2026-05-14 reference screenshots) that Android capture logic should detect before offering participant-analysis actions:
    - top moderation header like `Att granska`
    - active tab like `Deltagare <count>`
    - participant card rows that include `Har skickat en kommentar. Förhandsgranska`
    - participant card actions such as `Godkänn`, `Tacka nej`, and `...`
    - preview bottom sheet/dialog title `Förhandsgranska kommentar`
    - deep-followup link `Visa ursprungligt inlägg`
    - original-post sheet title in the form `<Name>s inlägg`
    - visible post text, visible comment thread bubbles, visible membership questions, and visible answers
  - The Android/mobile participant-analysis capture path should therefore be modeled as a sequential, preview-first capture session:
    1. capture the visible participant card
    2. capture the preview-comment sheet
    3. optionally follow `Visa ursprungligt inlägg`
    4. capture one or more additional visible screens while scrolling the original post/comment thread
    5. keep the screen awake and the current Facebook surface open while the capture session is active
  - Anchoring is expected to be weaker than in the browser helper. The first Android embryo should anchor analysis state to the currently captured Facebook participant/request/post surface and store each capture step with an explicit stage label such as `card`, `preview_comment`, `original_post`, or `original_post_scrolled` rather than pretending it has one stable DOM anchor.
  - Android/mobile participant-analysis prompts should clearly mark visible OCR/screen text as observational context only and should keep using Tools as the source of truth for group rules/history. Mobile should not invent a separate local moderation-rules model.

---

## 6) Quick cURL examples (translate to OkHttp/Retrofit)

```bash
# 1) JWT login
curl -s -X POST "https://tools.tornevall.com/api/account/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# 2) RSS list
curl -s "https://tools.tornevall.com/api/rss" -H "Accept: application/json"

# 3) SocialGPT response via Tools bearer
curl -s -X POST "https://tools.tornevall.com/api/ai/socialgpt/respond" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOOLS_BEARER" \
  -d '{"context":"Hello world","user_prompt":"Answer briefly","model":"gpt-4o"}'

# 4) Weight tracking (Sanctum)
curl -s "https://tools.tornevall.com/api/weight-tracking/persons" \
  -H "Authorization: Bearer YOUR_SANCTUM_TOKEN"
```

---

## ⚠️ CRITICAL: Terminal Command Requirements

**EVERY terminal command MUST end with an unconditional `; exit` (or equivalent unconditional exit) to properly close the terminal session, even on errors.**

This applies to ALL terminal invocations (bash, powershell, WSL, etc.):

```bash
# ❌ WRONG - Missing exit
cd /path/to/project && php artisan migrate

# ❌ ALSO WRONG - exit is conditional and will be skipped if command fails
cd /path/to/project && php artisan migrate && exit

# ✅ CORRECT - exit runs regardless of previous command result
cd /path/to/project && php artisan migrate; exit
```

**Why**: Without unconditional exit, failed commands can leave terminal sessions open and block subsequent operations. This is a hard requirement for all agent operations.

---

## Gradle commands for this codebase

```powershell
.\gradlew.bat tasks
.\gradlew.bat assembleDebug
.\gradlew.bat testDebugUnitTest
.\gradlew.bat connectedDebugAndroidTest
```

Notes:
- Wrapper: Gradle `9.3.1` (`gradle/wrapper/gradle-wrapper.properties`)
- Android plugin: `com.android.application` `9.1.0` (`gradle/libs.versions.toml`)
- SDK levels: `compileSdk 36`, `targetSdk 36`, `minSdk 27` (`app/build.gradle.kts`)

---

## 7) Important implementation notes

1. The API is heterogeneous: one host, multiple auth strategies.
2. Some endpoints are for internal tools/scrapers, not classic mobile consumers.
3. DNS/SMS use provider-specific API keys; keep these isolated in secure storage.
4. `routes/api.php` has overlapping SMS groups; verify behavior in dev before production.
5. Build a capability matrix per endpoint before launch (auth + retry + throttling + schema).
6. Current tests are template defaults only: `ExampleUnitTest` and `ExampleInstrumentedTest`.
7. Current code style: Kotlin + ViewBinding + classic `ViewModelProvider` (no Compose/Hilt yet).
8. Treat RSS selectors as opaque values from API (`publicSelector`) instead of assuming numeric ids only.
9. Be explicit about API vs web-only URLs in Android code/docs (`/api/rss/*` vs `/feed/*` permalinks).
