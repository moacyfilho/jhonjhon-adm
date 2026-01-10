import json
import os

def generate_inserts():
    file_path = r'c:\Users\zilda\OneDrive\Área de Trabalho\Projetos\jhonjhon\public\database-dump-2026-01-08T21-03-26.json'
    with open(file_path, 'r', encoding='utf-8') as f:
        dump = json.load(f)

    # Valid columns for each model based on Prisma schema
    valid_columns = {
        'User': ['id', 'name', 'email', 'emailVerified', 'image', 'password', 'role', 'createdAt', 'updatedAt'],
        'Barber': ['id', 'name', 'phone', 'email', 'password', 'commissionRate', 'hourlyRate', 'isActive', 'createdAt', 'updatedAt'],
        'Client': ['id', 'name', 'phone', 'email', 'createdAt', 'updatedAt'],
        'Service': ['id', 'name', 'description', 'price', 'duration', 'isActive', 'createdAt', 'updatedAt'],
        'Product': ['id', 'name', 'description', 'price', 'stock', 'unit', 'category', 'isActive', 'createdAt', 'updatedAt'],
        'Appointment': ['id', 'clientId', 'barberId', 'date', 'status', 'paymentMethod', 'totalAmount', 'workedHours', 'workedHoursSubscription', 'isSubscriptionAppointment', 'observations', 'onlineBookingId', 'createdAt', 'updatedAt'],
        'AppointmentService': ['id', 'appointmentId', 'serviceId', 'price', 'createdAt'],
        'AppointmentProduct': ['id', 'appointmentId', 'productId', 'quantity', 'unitPrice', 'totalPrice', 'createdAt'],
        'Commission': ['id', 'appointmentId', 'barberId', 'amount', 'status', 'paidAt', 'createdAt', 'updatedAt'],
        'CashRegister': ['id', 'openedBy', 'openedAt', 'closedAt', 'initialAmount', 'finalAmount', 'expectedAmount', 'difference', 'status', 'createdAt', 'updatedAt'],
        'CashMovement': ['id', 'cashRegisterId', 'type', 'amount', 'description', 'category', 'paymentMethod', 'createdAt', 'updatedAt'],
        'AccountPayable': ['id', 'description', 'category', 'supplier', 'amount', 'dueDate', 'paymentDate', 'status', 'paymentMethod', 'observations', 'createdAt', 'updatedAt'],
        'AccountReceivable': ['id', 'description', 'category', 'payer', 'clientId', 'phone', 'amount', 'dueDate', 'paymentDate', 'status', 'paymentMethod', 'observations', 'subscriptionId', 'createdAt', 'updatedAt'],
        'Subscription': ['id', 'clientId', 'planName', 'amount', 'billingDay', 'status', 'startDate', 'endDate', 'observations', 'servicesIncluded', 'usageLimit', 'createdAt', 'updatedAt'],
        'SubscriptionUsage': ['id', 'subscriptionId', 'usedDate', 'serviceDetails', 'bookingId', 'createdAt'],
        'PaymentLink': ['id', 'accountReceivableId', 'linkUrl', 'generatedBy', 'sentAt', 'expiresAt', 'status', 'observations', 'createdAt', 'updatedAt'],
        'OnlineBooking': ['id', 'clientId', 'clientName', 'clientPhone', 'clientEmail', 'serviceId', 'barberId', 'scheduledDate', 'status', 'isSubscriber', 'observations', 'createdAt', 'updatedAt'],
        'BookingSettings': ['id', 'schedule', 'serviceIds', 'barberIds', 'slotDuration', 'advanceBookingDays', 'minimumNotice', 'createdAt', 'updatedAt'],
        'ProductSale': ['id', 'productId', 'quantity', 'unitPrice', 'totalAmount', 'paymentMethod', 'soldBy', 'observations', 'soldAt', 'createdAt', 'updatedAt'],
        'ScheduleBlock': ['id', 'barberId', 'date', 'startTime', 'endTime', 'reason', 'createdAt', 'updatedAt']
    }

    array_columns = {
        'BookingSettings': ['serviceIds', 'barberIds']
    }

    mapping = {
        'users': 'User',
        'barbers': 'Barber',
        'clients': 'Client',
        'services': 'Service',
        'appointments': 'Appointment',
        'commissions': 'Commission',
        'cashRegisters': 'CashRegister',
        'cashMovements': 'CashMovement',
        'accountsPayable': 'AccountPayable',
        'accountsReceivable': 'AccountReceivable',
        'subscriptions': 'Subscription',
        'subscriptionUsages': 'SubscriptionUsage',
        'paymentLinks': 'PaymentLink',
        'onlineBookings': 'OnlineBooking',
        'bookingSettings': 'BookingSettings',
        'products': 'Product',
        'productSales': 'ProductSale',
        'scheduleBlocks': 'ScheduleBlock'
    }

    sql_statements = []

    table_order = [
         'users', 'barbers', 'clients', 'services', 'products',
        'cashRegisters', 'cashMovements', 'accountsPayable',
        'subscriptions', 'accountsReceivable', 'subscriptionUsages',
        'appointments',
        'commissions', 'paymentLinks', 'onlineBookings', 'bookingSettings',
        'productSales', 'scheduleBlocks'
    ]

    def format_value(v, col_name, table_name):
        if v is None:
            return "NULL"
        if isinstance(v, bool):
            return "true" if v else "false"
        if col_name in array_columns.get(table_name, []):
            if isinstance(v, list):
                elements = ["'{}'".format(str(e).replace("'", "''")) for e in v]
                return "ARRAY[{}]".format(", ".join(elements)) if elements else "'{}'::text[]"
            return "'{}'::text[]"
        if isinstance(v, (int, float)):
            return str(v)
        if isinstance(v, (dict, list)):
            json_val = json.dumps(v).replace("'", "''")
            return "'{}'::jsonb".format(json_val)
        
        str_val = str(v).replace("'", "''").replace('\n', '\\n').replace('\r', '\\r')
        return "'{}'".format(str_val)

    for key in table_order:
        if key not in dump['tables']:
            continue
        
        table_name = mapping.get(key, key)
        data = dump['tables'][key]['data']
        valid_cols = valid_columns.get(table_name, [])
        
        if not data:
            continue

        for item in data:
            columns = []
            values = []
            for k, v in item.items():
                if k not in valid_cols:
                    continue
                columns.append('"{}"'.format(k))
                values.append(format_value(v, k, table_name))
            
            if columns:
                sql = 'INSERT INTO "{}" ({}) VALUES ({});'.format(table_name, ", ".join(columns), ", ".join(values))
                sql_statements.append(sql)

            # Handle nested Appointment relations
            if table_name == 'Appointment':
                if 'services' in item and isinstance(item['services'], list):
                    for svc in item['services']:
                        svc_cols = []
                        svc_vals = []
                        svc_data = svc.copy()
                        svc_data['appointmentId'] = item['id']
                        for sk, sv in svc_data.items():
                            if sk in valid_columns['AppointmentService']:
                                svc_cols.append('"{}"'.format(sk))
                                svc_vals.append(format_value(sv, sk, 'AppointmentService'))
                        if svc_cols:
                            sql = 'INSERT INTO "AppointmentService" ({}) VALUES ({});'.format(", ".join(svc_cols), ", ".join(svc_vals))
                            sql_statements.append(sql)
                
                if 'products' in item and isinstance(item['products'], list):
                    for prd in item['products']:
                        prd_cols = []
                        prd_vals = []
                        prd_data = prd.copy()
                        prd_data['appointmentId'] = item['id']
                        for pk, pv in prd_data.items():
                            if pk in valid_columns['AppointmentProduct']:
                                prd_cols.append('"{}"'.format(pk))
                                prd_vals.append(format_value(pv, pk, 'AppointmentProduct'))
                        if prd_cols:
                            sql = 'INSERT INTO "AppointmentProduct" ({}) VALUES ({});'.format(", ".join(prd_cols), ", ".join(prd_vals))
                            sql_statements.append(sql)

    output_path = r'c:\Users\zilda\OneDrive\Área de Trabalho\Projetos\jhonjhon\public\restore.sql'
    with open(output_path, 'w', encoding='utf-8') as f:
        for stmt in sql_statements:
            f.write(stmt + "\n")

if __name__ == "__main__":
    generate_inserts()
