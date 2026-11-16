PRAGMA foreign_keys = ON;
CREATE TABLE schools (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE setup (id INTEGER PRIMARY KEY CHECK(id=1));
CREATE TABLE users (
 id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), name TEXT NOT NULL,
 email TEXT NOT NULL COLLATE NOCASE UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','enseignant','parent','intendant')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), UNIQUE(id, school_id)
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires);
CREATE TABLE login_attempts (id INTEGER PRIMARY KEY, fingerprint TEXT NOT NULL, stamp INTEGER NOT NULL);
CREATE INDEX attempts_lookup ON login_attempts(fingerprint, stamp);
CREATE TABLE years (id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0 CHECK(active IN(0,1)), archived INTEGER NOT NULL DEFAULT 0, UNIQUE(id,school_id));
CREATE UNIQUE INDEX years_active ON years(school_id) WHERE active=1 AND archived=0;
CREATE TABLE classes (id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), name TEXT NOT NULL, teacher_id TEXT, archived INTEGER NOT NULL DEFAULT 0, UNIQUE(id,school_id), FOREIGN KEY(teacher_id,school_id) REFERENCES users(id,school_id));
CREATE TABLE students (id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id), name TEXT NOT NULL, class_id TEXT NOT NULL, parent_id TEXT, archived INTEGER NOT NULL DEFAULT 0, UNIQUE(id,school_id), FOREIGN KEY(class_id,school_id) REFERENCES classes(id,school_id), FOREIGN KEY(parent_id,school_id) REFERENCES users(id,school_id));
CREATE INDEX students_scope ON students(school_id,class_id,parent_id);
CREATE TABLE grades (id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),student_id TEXT NOT NULL,year_id TEXT NOT NULL,term TEXT NOT NULL,subject TEXT NOT NULL,score REAL NOT NULL,maximum REAL NOT NULL,coefficient REAL NOT NULL,archived INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(student_id,school_id) REFERENCES students(id,school_id),FOREIGN KEY(year_id,school_id) REFERENCES years(id,school_id),CHECK(score>=0 AND maximum>0 AND score<=maximum AND coefficient>0));
CREATE TABLE attendance (id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),student_id TEXT NOT NULL,year_id TEXT NOT NULL,day TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN('Présent','Absent','Retard')),archived INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(student_id,school_id) REFERENCES students(id,school_id),FOREIGN KEY(year_id,school_id) REFERENCES years(id,school_id));
CREATE UNIQUE INDEX attendance_day ON attendance(student_id,year_id,day) WHERE archived=0;
CREATE TABLE suppliers(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),name TEXT NOT NULL,email TEXT NOT NULL DEFAULT '',phone TEXT NOT NULL DEFAULT '',archived INTEGER NOT NULL DEFAULT 0,UNIQUE(id,school_id));
CREATE TABLE items(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),name TEXT NOT NULL,quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity>=0),archived INTEGER NOT NULL DEFAULT 0,UNIQUE(id,school_id));
CREATE TABLE orders(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),supplier_id TEXT NOT NULL,item_id TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),status TEXT NOT NULL DEFAULT 'demandee' CHECK(status IN('demandee','approuvee','recue','annulee')),archived INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(supplier_id,school_id) REFERENCES suppliers(id,school_id),FOREIGN KEY(item_id,school_id) REFERENCES items(id,school_id));
CREATE TRIGGER receive_order AFTER UPDATE OF status ON orders WHEN NEW.status='recue' AND OLD.status='approuvee' BEGIN UPDATE items SET quantity=quantity+NEW.quantity WHERE id=NEW.item_id AND school_id=NEW.school_id; END;
CREATE TRIGGER order_transition BEFORE UPDATE OF status ON orders WHEN NOT ((OLD.status='demandee' AND NEW.status IN('approuvee','annulee')) OR (OLD.status='approuvee' AND NEW.status='recue')) BEGIN SELECT RAISE(ABORT,'Transition de commande invalide'); END;
CREATE TABLE stock_moves(id INTEGER PRIMARY KEY,item_id TEXT NOT NULL REFERENCES items(id),delta INTEGER NOT NULL,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TRIGGER item_movement AFTER UPDATE OF quantity ON items WHEN NEW.quantity<>OLD.quantity BEGIN INSERT INTO stock_moves(item_id,delta) VALUES(NEW.id,NEW.quantity-OLD.quantity); END;
CREATE TABLE audit(id TEXT PRIMARY KEY,school_id TEXT NOT NULL REFERENCES schools(id),user_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,entity TEXT NOT NULL,record_id TEXT,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX audit_scope ON audit(school_id,created);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit append-only'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit append-only'); END;
