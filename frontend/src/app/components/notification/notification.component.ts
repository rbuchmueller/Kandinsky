import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent {
  @Input() message: string = ''; // The message to display
  @Input() title: string = 'Default'; // The title to display
  @Input() smallTitle: string = 'Default'; // The title to display


  @Output() closeNotification = new EventEmitter<void>();

  close() {
    this.closeNotification.emit(); // Emit the event to the parent component
  }

}
