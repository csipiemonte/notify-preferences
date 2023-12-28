CREATE TABLE unppreferences.services (
	uuid varchar(36) NOT NULL,
	name varchar(255) NOT NULL,
	channels varchar(255) NULL,
	tags text[] NULL,
	CONSTRAINT idx_10515524_primary PRIMARY KEY (uuid)
);
CREATE UNIQUE INDEX idx_10515524_name ON unppreferences.services USING btree (name);
CREATE INDEX services_tags_array_idx_gin ON unppreferences.services USING gin (tags);


CREATE TABLE unppreferences.users (
	user_id varchar(255) NOT NULL,
	sms varchar(30) NULL,
	phone varchar(30) NULL,
	email varchar(255) NULL,
	push text NULL,
	"language" varchar(255) NULL,
	interests varchar(255) NULL,
	CONSTRAINT users_pk PRIMARY KEY (user_id)
);


CREATE TABLE unppreferences.users_s (
	user_id varchar(255) NOT NULL,
	sms varchar(255) NULL,
	phone varchar(255) NULL,
	email varchar(255) NULL,
	push text NULL,
	"language" varchar(255) NULL,
	interests varchar(255) NULL,
	"timestamp" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT users_s_pk PRIMARY KEY (user_id, "timestamp")
);


CREATE TABLE unppreferences.users_services (
	uuid varchar(36) NOT NULL,
	user_id varchar(255) NOT NULL,
	service_name varchar(255) NOT NULL,
	channels varchar(255) NULL,
	CONSTRAINT idx_10515737_primary PRIMARY KEY (uuid)
);
CREATE UNIQUE INDEX idx_10515737_user_id ON unppreferences.users_services USING btree (user_id, service_name);


CREATE TABLE unppreferences.users_services_s (
	uuid varchar(36) NOT NULL,
	user_id varchar(255) NOT NULL,
	service_name varchar(255) NOT NULL,
	channels varchar(255) NULL,
	"timestamp" timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT idx_10515801_primary PRIMARY KEY (uuid, "timestamp")
);


CREATE TABLE unppreferences.users_terms (
	user_id varchar(255) NOT NULL,
	accepted_at timestamptz NULL,
	hashed_terms varchar(255) NULL,
	CONSTRAINT idx_10515853_primary PRIMARY KEY (user_id)
);


CREATE TABLE unppreferences.users_terms_s (
	user_id varchar(255) NOT NULL,
	accepted_at timestamptz NULL,
	hashed_terms varchar(255) NULL,
	"timestamp" timestamptz NOT NULL,
	CONSTRAINT idx_10515908_primary PRIMARY KEY (user_id, "timestamp")
);