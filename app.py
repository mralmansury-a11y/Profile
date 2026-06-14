from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
import sqlite3
import os
from datetime import datetime
import json

app = Flask(__name__)
app.secret_key = 'mohammed-portfolio-secret-2025'

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'portfolio.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        title_ar TEXT,
        description TEXT,
        description_ar TEXT,
        tech_stack TEXT,
        category TEXT DEFAULT 'web',
        image_url TEXT,
        demo_url TEXT,
        github_url TEXT,
        price REAL DEFAULT 0,
        is_for_sale INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        buyer_name TEXT NOT NULL,
        buyer_email TEXT NOT NULL,
        buyer_phone TEXT,
        payment_method TEXT DEFAULT 'cash',
        amount REAL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        level INTEGER DEFAULT 80,
        icon TEXT
    )''')

    # Seed data
    c.execute("SELECT COUNT(*) FROM projects")
    if c.fetchone()[0] == 0:
        projects = [
            ('Ticket System - Al Madina Paints', 'نظام التذاكر - دهانات المدينة',
             'A complete ticket management and monitoring system built for Al Madina Paints company in Misurata. Enables IT department to track, assign and resolve support tickets efficiently.',
             'نظام متكامل لإدارة ومراقبة طلبات الدعم الفني لشركة دهانات المدينة مصراتة. يمكن قسم تقنية المعلومات من تتبع وتعيين وحل التذاكر بكفاءة.',
             'HTML,CSS,JavaScript,Bootstrap,PHP', 'web', None,
             'https://github.com/mralmansury-a11y/TicketSystem-Almadina',
             'https://github.com/mralmansury-a11y/TicketSystem-Almadina',
             500, 1, 1),
            ('WhatsApp Ticket System', 'نظام تذاكر واتساب',
             'Advanced ticket system integrated with WhatsApp for Al Madina Paints. Uses OS Ticket platform with custom modifications for Arabic support and local business needs.',
             'نظام تذاكر متقدم متكامل مع واتساب لشركة دهانات المدينة. يستخدم منصة OS Ticket مع تخصيصات لدعم العربية واحتياجات السوق المحلي.',
             'HTML,CSS,JavaScript,OS Ticket,PHP', 'web', None,
             None,
             'https://github.com/mralmansury-a11y/TicketSystemWhatsapp',
             300, 1, 1),
            ('Stadium Booking System', 'نظام حجز الملاعب',
             'A web application for managing stadium reservations with MySQL database. Features online booking, schedule management, and payment tracking for sports facilities.',
             'تطبيق ويب لإدارة حجوزات الملاعب الرياضية مع قاعدة بيانات MySQL. يتميز بالحجز الإلكتروني وإدارة الجداول الزمنية وتتبع المدفوعات.',
             'HTML,CSS,JavaScript,Bootstrap,MySQL,Python', 'web', None,
             None,
             'https://github.com/mralmansury-a11y/StadiumBookSystemWrbViewApp-MySQL',
             400, 1, 0),
            ('Graduation Project - Books Stadium', 'مشروع التخرج - Books Stadium',
             'Final year graduation project — a comprehensive platform combining an online bookstore with stadium booking management. Built as a full-stack application with modern UI.',
             'مشروع التخرج - منصة شاملة تجمع بين متجر الكتب الإلكتروني وإدارة حجوزات الملاعب. تم بناؤه كتطبيق Full Stack مع واجهة مستخدم حديثة.',
             'Python,Flask,SQLite,HTML,CSS,JavaScript,Bootstrap', 'web', None,
             None,
             'https://github.com/mralmansury-a11y/Graduation-Project-BooksStadium',
             600, 1, 1),
            ('Coffee Shop Website', 'موقع كوفي شوب',
             'A stylish coffee shop website with menu display, online ordering concept, and elegant design. Features smooth animations and responsive layout for all devices.',
             'موقع أنيق لمقهى مع عرض القائمة ومفهوم الطلب الإلكتروني وتصميم راقي. يتميز بحركات سلسة وتصميم متجاوب لجميع الأجهزة.',
             'HTML,CSS,JavaScript,Bootstrap', 'web', None,
             'https://github.com/mralmansury-a11y/cofeeAmp',
             'https://github.com/mralmansury-a11y/cofeeAmp',
             150, 1, 0),
            ('Samba Project', 'مشروع سمبا',
             'A web development project showcasing creative design and interactive features. Built with modern frontend technologies.',
             'مشروع تطوير ويب يعرض تصميماً إبداعياً وميزات تفاعلية. مبني بتقنيات الواجهة الأمامية الحديثة.',
             'HTML,CSS,JavaScript', 'web', None,
             None,
             'https://github.com/mralmansury-a11y/samba',
             200, 1, 0),
        ]
        c.executemany('''INSERT INTO projects 
            (title, title_ar, description, description_ar, tech_stack, category, image_url, demo_url, github_url, price, is_for_sale, is_featured)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''', projects)

        skills = [
            ('Python / Flask', 'backend', 85, '🐍'),
            ('C# / Blazor', 'backend', 80, '⚡'),
            ('C++', 'backend', 75, '🔧'),
            ('Full Stack Web', 'web', 88, '🌐'),
            ('HTML / CSS / JS', 'frontend', 90, '🎨'),
            ('Bootstrap', 'frontend', 88, '📱'),
            ('SQLite / MySQL', 'database', 82, '🗄️'),
            ('CorelDRAW', 'design', 78, '✏️'),
            ('Git / GitHub', 'tools', 80, '📦'),
            ('Technical Support', 'other', 90, '🛠️'),
        ]
        c.executemany('INSERT INTO skills (name, category, level, icon) VALUES (?,?,?,?)', skills)

    conn.commit()
    conn.close()


# ─── Public Routes ───────────────────────────────────────────────

@app.route('/')
def index():
    conn = get_db()
    projects = conn.execute('SELECT * FROM projects ORDER BY is_featured DESC, created_at DESC').fetchall()
    skills = conn.execute('SELECT * FROM skills ORDER BY level DESC').fetchall()
    conn.close()
    return render_template('index.html', projects=projects, skills=skills)


@app.route('/project/<int:pid>')
def project_detail(pid):
    conn = get_db()
    project = conn.execute('SELECT * FROM projects WHERE id=?', (pid,)).fetchone()
    conn.close()
    if not project:
        return redirect(url_for('index'))
    return render_template('project_detail.html', project=project)


@app.route('/buy/<int:pid>', methods=['GET', 'POST'])
def buy_project(pid):
    conn = get_db()
    project = conn.execute('SELECT * FROM projects WHERE id=? AND is_for_sale=1', (pid,)).fetchone()
    if not project:
        conn.close()
        return redirect(url_for('index'))

    if request.method == 'POST':
        data = request.form
        conn.execute('''INSERT INTO orders (project_id, buyer_name, buyer_email, buyer_phone, payment_method, amount, notes)
            VALUES (?,?,?,?,?,?,?)''',
            (pid, data['name'], data['email'], data.get('phone',''),
             data.get('payment_method','cash'), project['price'], data.get('notes','')))
        conn.commit()
        conn.close()
        return render_template('order_success.html', project=project)

    conn.close()
    return render_template('buy.html', project=project)


@app.route('/contact', methods=['POST'])
def contact():
    data = request.form
    conn = get_db()
    conn.execute('INSERT INTO messages (name, email, subject, message) VALUES (?,?,?,?)',
        (data['name'], data['email'], data.get('subject',''), data['message']))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'تم إرسال رسالتك بنجاح! سأتواصل معك قريباً.'})


# ─── Admin Routes ─────────────────────────────────────────────────

ADMIN_PASS = 'admin123'


@app.route('/admin')
def admin():
    if not session.get('admin'):
        return redirect(url_for('admin_login'))
    conn = get_db()
    projects = conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()
    orders = conn.execute('''SELECT o.*, p.title FROM orders o 
        JOIN projects p ON o.project_id=p.id ORDER BY o.created_at DESC''').fetchall()
    messages = conn.execute('SELECT * FROM messages ORDER BY created_at DESC').fetchall()
    stats = {
        'projects': conn.execute('SELECT COUNT(*) FROM projects').fetchone()[0],
        'orders': conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0],
        'revenue': conn.execute("SELECT SUM(amount) FROM orders WHERE status='completed'").fetchone()[0] or 0,
        'messages': conn.execute('SELECT COUNT(*) FROM messages WHERE is_read=0').fetchone()[0],
    }
    conn.close()
    return render_template('admin.html', projects=projects, orders=orders, messages=messages, stats=stats)


@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        if request.form.get('password') == ADMIN_PASS:
            session['admin'] = True
            return redirect(url_for('admin'))
        return render_template('admin_login.html', error='كلمة المرور غير صحيحة')
    return render_template('admin_login.html')


@app.route('/admin/logout')
def admin_logout():
    session.pop('admin', None)
    return redirect(url_for('index'))


@app.route('/admin/order/<int:oid>/status', methods=['POST'])
def update_order(oid):
    if not session.get('admin'):
        return jsonify({'error': 'unauthorized'}), 401
    status = request.json.get('status')
    conn = get_db()
    conn.execute('UPDATE orders SET status=? WHERE id=?', (status, oid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/admin/project/add', methods=['POST'])
def add_project():
    if not session.get('admin'):
        return jsonify({'error': 'unauthorized'}), 401
    d = request.form
    conn = get_db()
    conn.execute('''INSERT INTO projects (title, title_ar, description, description_ar, tech_stack,
        category, demo_url, github_url, price, is_for_sale, is_featured)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
        (d['title'], d.get('title_ar',''), d.get('description',''), d.get('description_ar',''),
         d.get('tech_stack',''), d.get('category','web'), d.get('demo_url',''),
         d.get('github_url',''), float(d.get('price',0)),
         1 if d.get('is_for_sale') else 0, 1 if d.get('is_featured') else 0))
    conn.commit()
    conn.close()
    return redirect(url_for('admin'))


@app.route('/admin/project/delete/<int:pid>', methods=['POST'])
def delete_project(pid):
    if not session.get('admin'):
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    conn.execute('DELETE FROM projects WHERE id=?', (pid,))
    conn.commit()
    conn.close()
    return redirect(url_for('admin'))


if __name__ == '__main__':
    os.makedirs('instance', exist_ok=True)
    init_db()
    app.run(debug=True, port=5000)
