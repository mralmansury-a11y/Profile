from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3
import os
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'mraheel-portfolio-secret-2025'

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'portfolio.db')

# ─── Site identity (single source of truth) ──────────────────────
SITE = {
    'name': 'MRaheel',
    'full_name_ar': 'محمد أحمد رحيل',
    'full_name_en': 'Mohammed Ahmed Raheel',
    'role_ar': 'مطور برمجيات Full Stack',
    'email': 'mohammed.ahmed.rahel@gmail.com',
    'phone': '0920353927',
    'github': 'https://github.com/mralmansury-a11y',
    'location_ar': 'مصراتة، ليبيا',
}


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

    # Seed data (only runs on a fresh/empty database)
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


@app.context_processor
def inject_site():
    return {'site': SITE}


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
            (pid, data['name'], data['email'], data.get('phone', ''),
             data.get('payment_method', 'cash'), project['price'], data.get('notes', '')))
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
        (data['name'], data['email'], data.get('subject', ''), data['message']))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'تم إرسال رسالتك بنجاح! سأتواصل معك قريباً.'})


# ─── Admin Auth ───────────────────────────────────────────────────

ADMIN_PASS = 'admin123'


def admin_required():
    return session.get('admin') is True


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


# ─── Admin Dashboard (shell + JSON API consumed by JS) ────────────

@app.route('/admin')
def admin():
    if not admin_required():
        return redirect(url_for('admin_login'))
    return render_template('admin.html')


def _stats(conn):
    revenue = conn.execute("SELECT SUM(amount) FROM orders WHERE status='completed'").fetchone()[0] or 0
    pending_revenue = conn.execute("SELECT SUM(amount) FROM orders WHERE status IN ('pending','confirmed')").fetchone()[0] or 0
    return {
        'projects': conn.execute('SELECT COUNT(*) FROM projects').fetchone()[0],
        'for_sale': conn.execute('SELECT COUNT(*) FROM projects WHERE is_for_sale=1').fetchone()[0],
        'orders': conn.execute('SELECT COUNT(*) FROM orders').fetchone()[0],
        'orders_pending': conn.execute("SELECT COUNT(*) FROM orders WHERE status='pending'").fetchone()[0],
        'revenue': revenue,
        'pending_revenue': pending_revenue,
        'messages': conn.execute('SELECT COUNT(*) FROM messages').fetchone()[0],
        'messages_unread': conn.execute('SELECT COUNT(*) FROM messages WHERE is_read=0').fetchone()[0],
    }


def _revenue_series(conn, days=14):
    """Daily completed-order revenue for the trailing `days` days."""
    rows = conn.execute('''SELECT date(created_at) d, SUM(amount) total
        FROM orders WHERE status='completed'
        GROUP BY date(created_at)''').fetchall()
    by_day = {r['d']: r['total'] for r in rows}
    today = datetime.utcnow().date()
    series = []
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        key = day.isoformat()
        series.append({'date': key, 'total': by_day.get(key, 0) or 0})
    return series


@app.route('/admin/api/overview')
def admin_api_overview():
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    data = {
        'stats': _stats(conn),
        'revenue_series': _revenue_series(conn),
        'recent_orders': [dict(r) for r in conn.execute(
            '''SELECT o.*, p.title FROM orders o JOIN projects p ON o.project_id=p.id
               ORDER BY o.created_at DESC LIMIT 5''').fetchall()],
        'recent_messages': [dict(r) for r in conn.execute(
            'SELECT * FROM messages ORDER BY created_at DESC LIMIT 5').fetchall()],
    }
    conn.close()
    return jsonify(data)


@app.route('/admin/api/projects', methods=['GET', 'POST'])
def admin_api_projects():
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    if request.method == 'POST':
        d = request.get_json(force=True)
        conn.execute('''INSERT INTO projects (title, title_ar, description, description_ar, tech_stack,
            category, demo_url, github_url, price, is_for_sale, is_featured)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
            (d.get('title', ''), d.get('title_ar', ''), d.get('description', ''), d.get('description_ar', ''),
             d.get('tech_stack', ''), d.get('category', 'web'), d.get('demo_url', ''),
             d.get('github_url', ''), float(d.get('price') or 0),
             1 if d.get('is_for_sale') else 0, 1 if d.get('is_featured') else 0))
        conn.commit()
        new_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
        row = conn.execute('SELECT * FROM projects WHERE id=?', (new_id,)).fetchone()
        conn.close()
        return jsonify({'success': True, 'project': dict(row)})
    projects = [dict(r) for r in conn.execute('SELECT * FROM projects ORDER BY created_at DESC').fetchall()]
    conn.close()
    return jsonify({'projects': projects})


@app.route('/admin/api/projects/<int:pid>', methods=['PUT', 'DELETE'])
def admin_api_project_detail(pid):
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM projects WHERE id=?', (pid,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})

    d = request.get_json(force=True)
    fields = ['title', 'title_ar', 'description', 'description_ar', 'tech_stack',
              'category', 'demo_url', 'github_url']
    sets = ', '.join(f'{f}=?' for f in fields)
    values = [d.get(f, '') for f in fields]
    values += [float(d.get('price') or 0), 1 if d.get('is_for_sale') else 0, 1 if d.get('is_featured') else 0, pid]
    conn.execute(f'UPDATE projects SET {sets}, price=?, is_for_sale=?, is_featured=? WHERE id=?', values)
    conn.commit()
    row = conn.execute('SELECT * FROM projects WHERE id=?', (pid,)).fetchone()
    conn.close()
    return jsonify({'success': True, 'project': dict(row) if row else None})


@app.route('/admin/api/orders')
def admin_api_orders():
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    orders = [dict(r) for r in conn.execute(
        '''SELECT o.*, p.title FROM orders o JOIN projects p ON o.project_id=p.id
           ORDER BY o.created_at DESC''').fetchall()]
    conn.close()
    return jsonify({'orders': orders})


@app.route('/admin/api/orders/<int:oid>', methods=['PUT'])
def admin_api_update_order(oid):
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    status = request.get_json(force=True).get('status')
    conn = get_db()
    conn.execute('UPDATE orders SET status=? WHERE id=?', (status, oid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/admin/api/messages')
def admin_api_messages():
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    messages = [dict(r) for r in conn.execute('SELECT * FROM messages ORDER BY created_at DESC').fetchall()]
    conn.close()
    return jsonify({'messages': messages})


@app.route('/admin/api/messages/<int:mid>', methods=['PUT', 'DELETE'])
def admin_api_message_detail(mid):
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM messages WHERE id=?', (mid,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    is_read = request.get_json(force=True).get('is_read', 1)
    conn.execute('UPDATE messages SET is_read=? WHERE id=?', (1 if is_read else 0, mid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


@app.route('/admin/api/skills', methods=['GET', 'POST'])
def admin_api_skills():
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    if request.method == 'POST':
        d = request.get_json(force=True)
        conn.execute('INSERT INTO skills (name, category, level, icon) VALUES (?,?,?,?)',
            (d.get('name', ''), d.get('category', ''), int(d.get('level') or 80), d.get('icon', '⭐')))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    skills = [dict(r) for r in conn.execute('SELECT * FROM skills ORDER BY level DESC').fetchall()]
    conn.close()
    return jsonify({'skills': skills})


@app.route('/admin/api/skills/<int:sid>', methods=['PUT', 'DELETE'])
def admin_api_skill_detail(sid):
    if not admin_required():
        return jsonify({'error': 'unauthorized'}), 401
    conn = get_db()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM skills WHERE id=?', (sid,))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    d = request.get_json(force=True)
    conn.execute('UPDATE skills SET name=?, category=?, level=?, icon=? WHERE id=?',
        (d.get('name', ''), d.get('category', ''), int(d.get('level') or 80), d.get('icon', '⭐'), sid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


if __name__ == '__main__':
    os.makedirs(os.path.join(os.path.dirname(__file__), 'instance'), exist_ok=True)
    init_db()
    app.run(debug=True, port=5000)
