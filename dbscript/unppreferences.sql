--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: unppreferences; Type: SCHEMA; Schema: -; Owner: unppreferences
--

CREATE SCHEMA unppreferences;


ALTER SCHEMA unppreferences OWNER TO unppreferences;

SET default_tablespace = '';

CREATE TABLE unppreferences.ioapp_subscriptions_feed
(
    id character varying NOT NULL,
    tenant character varying NOT NULL,
    service_name character varying NOT NULL,
    subscriber character varying NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
);

ALTER TABLE IF EXISTS unppreferences.ioapp_subscriptions_feed
    ADD CONSTRAINT unique_ioapp_subs_feed_tenant_service_subscriber UNIQUE (tenant, service_name, subscriber);

CREATE INDEX idx_ioapp_subs_feed_tenant_service_subscriber ON unppreferences.ioapp_subscriptions_feed (tenant, service_name, subscriber);

ALTER TABLE IF EXISTS unppreferences.ioapp_subscriptions_feed
    OWNER to unppreferences;

CREATE TABLE unppreferences.ioapp_subscriptions_feed_status
(
    id character varying NOT NULL,
    tenant character varying NOT NULL,
    service_name character varying NOT NULL,
    last_update_date date NOT NULL,
    PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
);

ALTER TABLE IF EXISTS unppreferences.ioapp_subscriptions_feed_status
    ADD CONSTRAINT ioappsubsfeedstatus_tenant_servicename_unique UNIQUE (tenant, service_name);

ALTER TABLE IF EXISTS unppreferences.ioapp_subscriptions_feed_status
    OWNER to unppreferences;

--
-- Name: broadcast; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.broadcast (
    uuid character varying(36) NOT NULL,
    name character varying(255),
    service character varying(255),
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    status character varying(255) NOT NULL,
    mex text,
    token text,
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.broadcast OWNER TO unppreferences;

--
-- Name: services; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.services (
    uuid character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    channels character varying(255),
    tags text[],
    mex_enforced_tags character varying(255),
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.services OWNER TO unppreferences;

--
-- Name: users; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.users (
    user_id character varying(255) NOT NULL,
    sms character varying(30),
    phone character varying(30),
    email character varying(255),
    push text,
    language character varying(255),
    interests character varying(255),
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.users OWNER TO unppreferences;

--
-- Name: users_s; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.users_s (
    user_id character varying(255) NOT NULL,
    sms character varying(255),
    phone character varying(255),
    email character varying(255),
    push text,
    language character varying(255),
    interests character varying(255),
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.users_s OWNER TO unppreferences;

--
-- Name: users_services; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.users_services (
    uuid character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    service_name character varying(255) NOT NULL,
    channels character varying(255),
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.users_services OWNER TO unppreferences;

--
-- Name: users_services_s; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.users_services_s (
    uuid character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    service_name character varying(255) NOT NULL,
    channels character varying(255),
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.users_services_s OWNER TO unppreferences;

--
-- Name: users_terms; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.users_terms (
    user_id character varying(255) NOT NULL,
    accepted_at timestamp with time zone,
    hashed_terms character varying(255),
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.users_terms OWNER TO unppreferences;

--
-- Name: users_terms_s; Type: TABLE; Schema: unppreferences; Owner: unppreferences
--

CREATE TABLE unppreferences.users_terms_s (
    user_id character varying(255) NOT NULL,
    accepted_at timestamp with time zone,
    hashed_terms character varying(255),
    "timestamp" timestamp with time zone NOT NULL,
    tenant character varying(16) NOT NULL
);


ALTER TABLE unppreferences.users_terms_s OWNER TO unppreferences;

--
-- Name: broadcast idx_2497045_primary; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.broadcast
    ADD CONSTRAINT idx_2497045_primary PRIMARY KEY (uuid);


--
-- Name: services idx_2497052_primary; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.services
    ADD CONSTRAINT idx_2497052_primary PRIMARY KEY (uuid);


--
-- Name: users_services idx_2497071_primary; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.users_services
    ADD CONSTRAINT idx_2497071_primary PRIMARY KEY (uuid);


--
-- Name: users_services_s idx_2497077_primary; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.users_services_s
    ADD CONSTRAINT idx_2497077_primary PRIMARY KEY (uuid, "timestamp");


--
-- Name: users users_pk; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.users
    ADD CONSTRAINT users_pk PRIMARY KEY (user_id, tenant);


--
-- Name: users_s users_s_pk; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.users_s
    ADD CONSTRAINT users_s_pk PRIMARY KEY (user_id, tenant, "timestamp");


--
-- Name: users_terms users_terms_pk; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.users_terms
    ADD CONSTRAINT users_terms_pk PRIMARY KEY (user_id, tenant);


--
-- Name: users_terms_s users_terms_s_pk; Type: CONSTRAINT; Schema: unppreferences; Owner: unppreferences
--

ALTER TABLE ONLY unppreferences.users_terms_s
    ADD CONSTRAINT users_terms_s_pk PRIMARY KEY (user_id, tenant, "timestamp");


--
-- Name: idx_services_name_tenant; Type: INDEX; Schema: unppreferences; Owner: unppreferences
--

CREATE UNIQUE INDEX idx_services_name_tenant ON unppreferences.services USING btree (name, tenant);


--
-- Name: idx_users_services_user_id; Type: INDEX; Schema: unppreferences; Owner: unppreferences
--

CREATE UNIQUE INDEX idx_users_services_user_id ON unppreferences.users_services USING btree (user_id, service_name, tenant);


--
-- Name: services_tags_array_idx_gin; Type: INDEX; Schema: unppreferences; Owner: unppreferences
--

CREATE INDEX services_tags_array_idx_gin ON unppreferences.services USING gin (tags);
