export function getDriverForDBMS(dbms: 'oracle' | 'mysql' | 'mariadb' | 'postgres'): string {
    switch (dbms) {
        case 'oracle':
            return 'oracle.jdbc.driver.OracleDriver';
        case 'mysql':
        case 'mariadb':
            return 'com.mysql.cj.jdbc.Driver';
        case 'postgres':
            return 'org.postgresql.Driver';
        default:
            throw new Error(`Unsupported DBMS type: ${dbms}`);
    }
}

export function getUrlForDBMS(dbms: 'oracle' | 'mysql' | 'mariadb' | 'postgres', projectName: string): string {
    // Generate dynamic host and db name based on the project namespace (enforce RFC 1123 for K8s)
    const k8sSlug = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const host = `${k8sSlug}.svc.cluster.local`;
    const dbName = projectName.replace(/-/g, '_');

    switch (dbms) {
        case 'oracle':
            return `jdbc:oracle:thin:@//oracle-db.${host}:1521/XEPDB1`;
        case 'mysql':
            return `jdbc:mysql://mysql-db.${host}:3306/${dbName}_DEVELOP`;
        case 'mariadb':
            return `jdbc:mariadb://maria-db${host}:3306/${dbName}_DEVELOP`;
        case 'postgres':
            return `jdbc:postgresql://postgres-db.${host}:5432/${dbName}_DEVELOP`;
        default:
            throw new Error(`Unsupported DBMS type: ${dbms}`);
    }
}
